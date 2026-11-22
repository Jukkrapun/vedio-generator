"""MuseTalk 1.5 lip-sync on vast.ai — rents a GPU instance only for the job, then destroys it.

Used by tools/lipsync.py when the engine is "musetalk". Standalone:
    python tools/musetalk_vast.py --offers     # show the cheapest matching GPUs (no cost)
    python tools/musetalk_vast.py --cleanup    # destroy an instance left over from a crashed run
    python tools/musetalk_vast.py --check      # (fixed-instance mode) test the SSH connection

Flow per job (on-demand, default):
  search cheapest offer -> create instance -> wait for SSH -> install MuseTalk 1.5 + weights
  -> upload face/voice -> inference -> download mp4 -> DESTROY instance (always, also on errors).
The live instance id is written to .vast-instance.json (git-ignored) until destroyed, so a crash
can be cleaned up with --cleanup. Billing stops only when the instance is destroyed.

.env:
    VAST_API_KEY=...            vast.ai → Account → API Keys  (never print it)
    VAST_SSH_KEY=C:/Users/<you>/.ssh/id_ed25519   optional; its .pub must be in vast.ai → Account → SSH Keys
    VAST_QUERY=...              optional offer filter (default DEFAULT_QUERY below)
    VAST_MAX_DPH=0.6            optional max $/hour
  Fixed-instance mode instead (instance you keep running yourself): VAST_SSH_HOST + VAST_SSH_PORT,
  optional VAST_SSH_USER, MUSETALK_DIR, MUSETALK_PYTHON.
"""
import json
import os
import shlex
import shutil
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

from media import ROOT
from timing import step

REMOTE_ROOT = "/tmp/vdio-musetalk"
JOB_TIMEOUT_SEC = 1800
STATE = ROOT / ".vast-instance.json"
IMAGE = "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime"  # torch version MuseTalk 1.5 expects
DISK_GB = 40
DEFAULT_QUERY = ("num_gpus=1 geolocation!=CN gpu_ram>=16 reliability>0.98 inet_down>300 disk_space>=50 "
                 "cuda_vers>=11.8 rentable=true verified=true")
BOOT_TIMEOUT_SEC = 1800  # image pull alone took ~12 min on a slow host (2026-11-22)
SETUP_TIMEOUT_SEC = 2400
MUSETALK_DIR = "/workspace/MuseTalk"
SETUP_SCRIPT = f"""set -e
if [ -f {MUSETALK_DIR}/.ready ]; then echo ready; exit 0; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git ffmpeg wget libgl1 libglib2.0-0 > /dev/null
mkdir -p /workspace && cd /workspace
[ -d MuseTalk ] || git clone -q https://github.com/TMElyralab/MuseTalk.git
cd MuseTalk
pip install -q -r requirements.txt
pip install -q -U openmim
mim install -q mmengine
mim install -q "mmcv==2.0.1"
mim install -q "mmdet==3.1.0"
mim install -q "mmpose==1.1.0"
pip install -q huggingface_hub gdown
sh ./download_weights.sh > /tmp/weights.log 2>&1 || (tail -n 30 /tmp/weights.log; exit 1)
test -f models/musetalkV15/unet.pth
touch .ready && echo ready
"""


# ---------- vast.ai CLI ----------

def vast(*args: str, timeout: int = 120) -> object:
    exe = shutil.which("vastai") or str(Path(sys.executable).parent / "vastai")
    key = os.getenv("VAST_API_KEY")
    if not key:
        raise RuntimeError("Set VAST_API_KEY in .env (vast.ai → Account → API Keys)")
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}  # cp874 console crashed the CLI
    r = subprocess.run([exe, *args, "--raw", "--api-key", key], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout, env=env)
    if r.returncode != 0:
        raise RuntimeError(f"vastai {args[0]} {args[1] if len(args) > 1 else ''} failed:\n{(r.stderr or r.stdout)[-2000:]}")
    out = r.stdout.strip()
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return out


def find_offers(limit: int = 5) -> list[dict]:
    query = os.getenv("VAST_QUERY", DEFAULT_QUERY) + f" dph<{os.getenv('VAST_MAX_DPH', '0.6')}"
    offers = vast("search", "offers", query, "-o", "dph")
    if not offers:
        raise RuntimeError(f"No vast.ai offers match: {query}")
    return offers[:limit]


def instance_ids(label: str | None = None) -> set[int]:
    r = vast("show", "instances")
    return {i["id"] for i in r if label is None or i.get("label") == label} if isinstance(r, list) else set()


def destroy(instance_id: int) -> None:
    """Destroy and VERIFY it is gone (the CLI asks y/N and exits 0 even when it did nothing)."""
    for attempt in range(5):
        try:
            vast("destroy", "instance", str(instance_id), "-y")
            time.sleep(3)
            if instance_id not in instance_ids():
                STATE.unlink(missing_ok=True)
                print(f"Destroyed vast instance {instance_id} (verified gone, billing stopped)")
                return
            print(f"WARNING: instance {instance_id} still listed after destroy, retrying ...", file=sys.stderr)
        except Exception as e:  # retry: a leaked instance keeps billing
            print(f"WARNING: destroy attempt {attempt + 1} failed: {e}", file=sys.stderr)
        time.sleep(5)
    print(f"!!! Could not destroy instance {instance_id}. Run: python tools/musetalk_vast.py --cleanup "
          f"or destroy it at https://cloud.vast.ai/instances/", file=sys.stderr)


def cleanup() -> None:
    """Destroy every instance this tool created (label vdio-musetalk) — never touches other instances."""
    ids = instance_ids(label="vdio-musetalk")
    if STATE.exists():
        ids.add(json.loads(STATE.read_text())["id"])
    if not ids:
        STATE.unlink(missing_ok=True)
        print("No instances on the account.")
    for i in ids:
        destroy(i)


def create_instance() -> tuple[int, dict]:
    offer = find_offers(1)[0]
    print(f"Renting {offer.get('gpu_name')} ({offer.get('gpu_ram', 0) / 1024:.0f}GB) at ${offer['dph_total']:.3f}/h, offer {offer['id']}")
    res = vast("create", "instance", str(offer["id"]), "--image", IMAGE, "--disk", str(DISK_GB),
               "--ssh", "--direct", "--label", "vdio-musetalk")
    instance_id = res["new_contract"]
    STATE.write_text(json.dumps({"id": instance_id, "created": time.time()}))
    key = os.getenv("VAST_SSH_KEY")
    if key and Path(key + ".pub").exists():  # attach our key, so account SSH keys don't matter
        vast("attach", "ssh", str(instance_id), Path(key + ".pub").read_text().strip())
    return instance_id, offer


def _endpoints(info: dict) -> list[tuple[str, str]]:
    """SSH (host, port) candidates: direct public IP first (faster), then vast's ssh proxy."""
    eps = []
    direct = ((info.get("ports") or {}).get("22/tcp") or [{}])[0].get("HostPort")
    if info.get("public_ipaddr") and direct:
        eps.append((info["public_ipaddr"].strip(), str(direct)))
    if info.get("ssh_host") and info.get("ssh_port"):
        eps.append((info["ssh_host"], str(info["ssh_port"])))
    return eps


def wait_ssh(instance_id: int, timeout: int = BOOT_TIMEOUT_SEC) -> dict:
    t0 = time.time()
    print("Waiting for instance to boot ...")
    last_status, last_err = None, ""
    while time.time() - t0 < timeout:
        info = vast("show", "instance", str(instance_id))
        if isinstance(info, dict) and "instances" in info:  # some CLI versions wrap it
            info = info["instances"]
        if isinstance(info, list):
            info = info[0] if info else {}
        if not isinstance(info, dict):
            raise RuntimeError(f"Unexpected 'vastai show instance' output: {str(info)[:300]}")
        status = f"{info.get('actual_status')} / {info.get('status_msg') or ''}".strip()
        if status != last_status:
            print(f"  [{time.time() - t0:4.0f}s] {status[:160]}")
            last_status = status
        if info.get("actual_status") == "running":
            for host, port in _endpoints(info):
                c = {"dest": f"root@{host}", "port": port, "key": os.getenv("VAST_SSH_KEY"),
                     "dir": MUSETALK_DIR, "python": "python"}
                try:
                    ssh(c, "echo ok", timeout=30)
                    print(f"SSH ready after {time.time() - t0:.0f}s via {host}:{port}")
                    return c
                except Exception as e:  # sshd not up yet / key not propagated
                    err = str(e).strip().splitlines()[-1][:200]
                    if err != last_err:
                        print(f"  ssh {host}:{port} not ready: {err}")
                        last_err = err
        time.sleep(15)
    raise TimeoutError(f"Instance {instance_id} not reachable over SSH after {timeout}s "
                       f"(last status: {last_status}; last ssh error: {last_err or 'none'})")


# ---------- ssh / scp ----------

def _opts(c: dict, port_flag: str) -> list[str]:
    o = [port_flag, c["port"], "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
         "-o", "BatchMode=yes", "-o", "ServerAliveInterval=30", "-o", "LogLevel=ERROR"]
    return o + (["-i", c["key"]] if c.get("key") else [])


def ssh(c: dict, command: str, timeout: int = 120) -> str:
    r = subprocess.run(["ssh", *_opts(c, "-p"), c["dest"], command], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"ssh failed ({r.returncode}): {command[:80]}...\n{(r.stderr + r.stdout)[-3000:]}")
    return r.stdout


def scp(c: dict, src: str, dst: str, timeout: int = 600) -> None:
    r = subprocess.run(["scp", *_opts(c, "-P"), src, dst], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"scp failed: {src} -> {dst}\n{r.stderr[-2000:]}")


def fixed_cfg() -> dict | None:
    host, port = os.getenv("VAST_SSH_HOST"), os.getenv("VAST_SSH_PORT")
    if not host or not port:
        return None
    return {"dest": f"{os.getenv('VAST_SSH_USER', 'root')}@{host}", "port": port,
            "key": os.getenv("VAST_SSH_KEY"), "dir": os.getenv("MUSETALK_DIR", MUSETALK_DIR),
            "python": os.getenv("MUSETALK_PYTHON", "python")}


# ---------- job ----------

def infer(c: dict, image_or_video: Path, audio: Path, out: Path, bbox_shift: int, fps: int) -> Path:
    job = f"{REMOTE_ROOT}/{int(time.time())}"
    src_name = "face" + image_or_video.suffix.lower()
    with step(f"upload {image_or_video.name} + {audio.name}"):
        ssh(c, f"mkdir -p {job}/results")
        scp(c, str(image_or_video), f"{c['dest']}:{job}/{src_name}")
        scp(c, str(audio), f"{c['dest']}:{job}/voice{audio.suffix}")
    config = (f"task_0:\n  video_path: \"{job}/{src_name}\"\n  audio_path: \"{job}/voice{audio.suffix}\"\n"
              f"  bbox_shift: {bbox_shift}\n")
    ssh(c, f"cat > {job}/task.yaml <<'YAML'\n{config}YAML")
    cmd = (f"cd {shlex.quote(c['dir'])} && {c['python']} -m scripts.inference"
           f" --inference_config {job}/task.yaml --result_dir {job}/results"
           f" --unet_model_path models/musetalkV15/unet.pth --unet_config models/musetalkV15/musetalk.json"
           f" --version v15 --fps {fps}")
    with step("MuseTalk inference"):
        log = ssh(c, f"bash -c {shlex.quote(cmd + ' 2>&1 | tail -n 40; exit ${PIPESTATUS[0]}')}", timeout=JOB_TIMEOUT_SEC)
        remote = ssh(c, f"ls -t {job}/results/v15/*.mp4 2>/dev/null | head -n 1").strip()
        if not remote:
            raise RuntimeError(f"MuseTalk produced no mp4. Last log lines:\n{log}")
    with step("download result"):
        scp(c, f"{c['dest']}:{remote}", str(out))
        ssh(c, f"rm -rf {job}")
    return out


@contextmanager
def musetalk_session():
    """Yield a ready MuseTalk connection; rent + set up once, destroy on exit (also on errors).
    Use it to lip-sync many clips on one instance: setup time is paid once per batch."""
    c = fixed_cfg()
    if c:  # user keeps an instance running
        yield c
        return
    if STATE.exists():
        raise RuntimeError(f"A vast instance from an earlier run may still be billing ({STATE}). "
                           "Run: python tools/musetalk_vast.py --cleanup")
    t0 = time.time()
    with step("rent instance"):
        instance_id, offer = create_instance()
    try:
        with step("boot + SSH ready (image pull)"):
            c = wait_ssh(instance_id)
        with step("install MuseTalk 1.5 + weights"):
            ssh(c, f"bash -c {shlex.quote(SETUP_SCRIPT)}", timeout=SETUP_TIMEOUT_SEC)
        yield c
    finally:
        with step("destroy instance"):
            destroy(instance_id)
        hours = (time.time() - t0) / 3600
        print(f"Instance time {hours * 60:.0f} min ≈ ${hours * offer['dph_total']:.2f} (+ small storage/bandwidth)")


def run_musetalk(image_or_video: Path, audio: Path, out: Path, bbox_shift: int = 0, fps: int = 25) -> Path:
    """One clip on its own instance. For several clips use musetalk_session() + infer()."""
    with musetalk_session() as c:
        return infer(c, image_or_video, audio, out, bbox_shift, fps)


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    arg = sys.argv[1:]
    if arg == ["--offers"]:
        for o in find_offers():
            print(f"{o['id']:>10}  {o.get('gpu_name'):<16} {o.get('gpu_ram', 0) / 1024:>4.0f}GB  ${o['dph_total']:.3f}/h  "
                  f"rel {o.get('reliability2', o.get('reliability', 0)):.3f}  {o.get('geolocation', '')}")
    elif arg == ["--cleanup"]:
        cleanup()
    elif arg == ["--check"]:
        c = fixed_cfg() or sys.exit("--check is for fixed-instance mode (VAST_SSH_HOST/PORT)")
        print(ssh(c, f"cd {shlex.quote(c['dir'])} && ls models/musetalkV15 && nvidia-smi -L").strip())
    else:
        sys.exit(__doc__)

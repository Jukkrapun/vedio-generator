"""MuseTalk 1.5 lip-sync on a running vast.ai instance, driven over SSH/SCP.

Used by tools/lipsync.py when the engine is "musetalk". Can also be run alone to test the connection:
    python tools/musetalk_vast.py --check

.env (vast.ai → Instances → "Connect" shows the ssh command):
    VAST_SSH_HOST=ssh4.vast.ai        VAST_SSH_PORT=12345
    VAST_SSH_USER=root                (default root)
    VAST_SSH_KEY=C:/Users/<you>/.ssh/id_ed25519   (optional; default ssh key otherwise)
    MUSETALK_DIR=/workspace/MuseTalk  (repo on the instance, models already downloaded)
    MUSETALK_PYTHON=python            (python with MuseTalk deps on the instance, e.g. a conda env path)

Input "video" may be a still image (POC) or a talking clip; MuseTalk outputs a clip as long as the audio.
"""
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path

REMOTE_ROOT = "/tmp/vdio-musetalk"
JOB_TIMEOUT_SEC = 1800


def _cfg() -> dict:
    host, port = os.getenv("VAST_SSH_HOST"), os.getenv("VAST_SSH_PORT")
    if not host or not port:
        raise RuntimeError("Set VAST_SSH_HOST and VAST_SSH_PORT in .env (from vast.ai → Connect)")
    return {
        "dest": f"{os.getenv('VAST_SSH_USER', 'root')}@{host}",
        "port": port,
        "key": os.getenv("VAST_SSH_KEY"),
        "dir": os.getenv("MUSETALK_DIR", "/workspace/MuseTalk"),
        "python": os.getenv("MUSETALK_PYTHON", "python"),
    }


def _opts(c: dict, port_flag: str) -> list[str]:
    o = [port_flag, c["port"], "-o", "StrictHostKeyChecking=accept-new", "-o", "BatchMode=yes",
         "-o", "ServerAliveInterval=30"]
    return o + (["-i", c["key"]] if c["key"] else [])


def ssh(c: dict, command: str, timeout: int = 120) -> str:
    r = subprocess.run(["ssh", *_opts(c, "-p"), c["dest"], command], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"ssh failed ({r.returncode}): {command[:80]}...\n{(r.stderr or r.stdout)[-3000:]}")
    return r.stdout


def scp(c: dict, src: str, dst: str, timeout: int = 600) -> None:
    r = subprocess.run(["scp", *_opts(c, "-P"), src, dst], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"scp failed: {src} -> {dst}\n{r.stderr[-2000:]}")


def check() -> None:
    c = _cfg()
    out = ssh(c, f"cd {shlex.quote(c['dir'])} && ls models/musetalkV15 && nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader")
    print(out.strip())


def run_musetalk(image_or_video: Path, audio: Path, out: Path, bbox_shift: int = 0, fps: int = 25) -> Path:
    """Upload inputs, run MuseTalk 1.5 inference, download the result to `out`."""
    c = _cfg()
    job = f"{REMOTE_ROOT}/{int(time.time())}"
    src_name = "face" + image_or_video.suffix.lower()
    ssh(c, f"mkdir -p {job}/results")
    print(f"Uploading {image_or_video.name} + {audio.name} to vast ...")
    scp(c, str(image_or_video), f"{c['dest']}:{job}/{src_name}")
    scp(c, str(audio), f"{c['dest']}:{job}/voice{audio.suffix}")

    config = (f"task_0:\n  video_path: \"{job}/{src_name}\"\n  audio_path: \"{job}/voice{audio.suffix}\"\n"
              f"  bbox_shift: {bbox_shift}\n")
    ssh(c, f"cat > {job}/task.yaml <<'YAML'\n{config}YAML")
    cmd = (f"cd {shlex.quote(c['dir'])} && {c['python']} -m scripts.inference"
           f" --inference_config {job}/task.yaml --result_dir {job}/results"
           f" --unet_model_path models/musetalkV15/unet.pth --unet_config models/musetalkV15/musetalk.json"
           f" --version v15 --fps {fps}")
    print("Running MuseTalk 1.5 on vast (first run loads models, can take a few minutes) ...")
    t0 = time.time()
    log = ssh(c, f"{cmd} 2>&1 | tail -n 40; exit ${{PIPESTATUS[0]}}", timeout=JOB_TIMEOUT_SEC)
    remote = ssh(c, f"ls -t {job}/results/v15/*.mp4 2>/dev/null | head -n 1").strip()
    if not remote:
        raise RuntimeError(f"MuseTalk produced no mp4. Last log lines:\n{log}")
    scp(c, f"{c['dest']}:{remote}", str(out))
    ssh(c, f"rm -rf {job}")
    print(f"MuseTalk done in {time.time() - t0:.0f}s")
    return out


if __name__ == "__main__":
    from dotenv import load_dotenv
    from media import ROOT
    load_dotenv(ROOT / ".env")
    if sys.argv[1:] == ["--check"]:
        check()
    else:
        sys.exit(__doc__)

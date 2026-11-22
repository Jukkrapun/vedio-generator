"""Shared vast.ai plumbing: rent a GPU for one job, SSH/SCP to it, always destroy it afterwards.

Used by tools/musetalk_vast.py and tools/infinitetalk_vast.py. Standalone:
    python tools/vast.py --cleanup     # destroy instances left over by our tools (labels vdio-*)

Every rented instance gets a label `vdio-<engine>`; the live id is kept in .vast-instance.json
(git-ignored) until destroyed, so a crashed run can be cleaned up. destroy() verifies the instance
is really gone (the CLI asks y/N and exits 0 even when it did nothing — cost us a leak 2026-11-22).

.env: VAST_API_KEY (required), VAST_SSH_KEY (private key WITHOUT passphrase; its .pub is attached
to each instance automatically).
"""
import json
import os
import shutil
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

from media import ROOT
from timing import fmt, step

STATE = ROOT / ".vast-instance.json"
BOOT_TIMEOUT_SEC = 1800  # image pull alone took ~12 min on a slow host (2026-11-22)


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


def find_offers(query: str, max_dph: float, limit: int = 5) -> list[dict]:
    full = f"{query} dph<{max_dph}"
    offers = vast("search", "offers", full, "-o", "dph")
    if not offers:
        raise RuntimeError(f"No vast.ai offers match: {full}")
    return offers[:limit]


def print_offers(offers: list[dict]) -> None:
    for o in offers:
        print(f"{o['id']:>10}  {o.get('gpu_name'):<16} {o.get('gpu_ram', 0) / 1024:>4.0f}GB  ${o['dph_total']:.3f}/h  "
              f"net {o.get('inet_down', 0):>5.0f}Mbps  rel {o.get('reliability2', o.get('reliability', 0)):.3f}  "
              f"{o.get('geolocation', '')}")


def instance_ids(label: str | None = None, prefix: str | None = None) -> set[int]:
    r = vast("show", "instances")
    if not isinstance(r, list):
        return set()
    return {i["id"] for i in r
            if (label is None or i.get("label") == label)
            and (prefix is None or str(i.get("label") or "").startswith(prefix))}


def destroy(instance_id: int) -> None:
    """Destroy and VERIFY it is gone."""
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
    print(f"!!! Could not destroy instance {instance_id}. Run: python tools/vast.py --cleanup "
          f"or destroy it at https://cloud.vast.ai/instances/", file=sys.stderr)


def cleanup() -> None:
    """Destroy every instance our tools created (labels vdio-*) — never touches other instances."""
    ids = instance_ids(prefix="vdio-")
    if STATE.exists():
        ids.add(json.loads(STATE.read_text())["id"])
    if not ids:
        STATE.unlink(missing_ok=True)
        print("No vdio-* instances on the account.")
    for i in ids:
        destroy(i)


def create_instance(offer: dict, image: str, disk_gb: int, label: str) -> int:
    print(f"Renting {offer.get('gpu_name')} ({offer.get('gpu_ram', 0) / 1024:.0f}GB) at "
          f"${offer['dph_total']:.3f}/h, offer {offer['id']}, image {image}")
    res = vast("create", "instance", str(offer["id"]), "--image", image, "--disk", str(disk_gb),
               "--ssh", "--direct", "--label", label)
    instance_id = res["new_contract"]
    STATE.write_text(json.dumps({"id": instance_id, "label": label, "created": time.time()}))
    key = os.getenv("VAST_SSH_KEY")
    if key and Path(key + ".pub").exists():  # attach our key, so account SSH keys don't matter
        vast("attach", "ssh", str(instance_id), Path(key + ".pub").read_text().strip())
    return instance_id


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
                c = {"dest": f"root@{host}", "port": port, "key": os.getenv("VAST_SSH_KEY")}
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


NOISE = ("Running pip as the 'root' user", "debconf: delaying")


def ssh(c: dict, command: str, timeout: int = 120) -> str:
    r = subprocess.run(["ssh", *_opts(c, "-p"), c["dest"], command], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        lines = [l for l in (r.stdout + "\n" + r.stderr).splitlines() if l.strip() and not any(n in l for n in NOISE)]
        raise RuntimeError(f"ssh failed ({r.returncode}): {command[:80]}...\n" + "\n".join(lines[-40:]))
    return r.stdout


def scp(c: dict, src: str, dst: str, timeout: int = 900) -> None:
    r = subprocess.run(["scp", *_opts(c, "-P"), src, dst], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"scp failed: {src} -> {dst}\n{r.stderr[-2000:]}")


def run_script(c: dict, name: str, script: str, timeout: int) -> None:
    """Run a staged bash script on the instance (lines `stage <name>` mark progress).
    Prints per-stage times; on failure reports the stage that broke + the end of its log."""
    log, path = f"/tmp/{name}.log", f"/tmp/{name}.sh"
    ssh(c, f"cat > {path} <<'VDIO_SCRIPT'\n{script}\nVDIO_SCRIPT")
    try:
        ssh(c, f"bash {path} > {log} 2>&1", timeout=timeout)
    except (RuntimeError, subprocess.TimeoutExpired) as e:
        stage = ssh(c, f"grep '^===' {log} | tail -n 1").strip() or "=== (before first stage)"
        tail = ssh(c, f"grep -v -e \"Running pip as the 'root'\" -e 'debconf:' {log} | tail -n 40")
        kind = "timed out" if isinstance(e, subprocess.TimeoutExpired) else "failed"
        raise RuntimeError(f"{name} {kind} at stage {' '.join(stage.split()[1:2])}:\n{tail}") from None
    marks = [l.split() for l in ssh(c, f"grep '^===' {log}; echo \"=== end $(date +%s)\"").splitlines()]
    for (_, sname, t), (_, _, t_next) in zip(marks, marks[1:]):  # "=== <stage> <epoch>"
        print(f"    {name} {sname:<22} {fmt(int(t_next) - int(t))}")


STAGE_FN = 'stage() { echo "=== $1 $(date +%s)"; }'


# ---------- session ----------

@contextmanager
def session(*, label: str, image: str, disk_gb: int, query: str, max_dph: float,
            setup_name: str, setup_script: str | None, setup_timeout: int, budget_usd: float | None = None):
    """Rent the cheapest matching GPU, run setup once, yield (conn, cost_fn); ALWAYS destroy on exit.
    cost_fn() returns the compute cost so far, so callers can stop before exceeding budget_usd."""
    if STATE.exists():
        raise RuntimeError(f"A vast instance from an earlier run may still be billing ({STATE}). "
                           "Run: python tools/vast.py --cleanup")
    t0 = time.time()
    with step("rent instance"):
        offer = find_offers(query, max_dph, 1)[0]
        instance_id = create_instance(offer, image, disk_gb, label)
    dph = offer["dph_total"]

    def cost() -> float:
        return (time.time() - t0) / 3600 * dph

    try:
        with step("boot + SSH ready (image pull)"):
            c = wait_ssh(instance_id)
        print(ssh(c, "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader; df -h /workspace 2>/dev/null | tail -1 || df -h / | tail -1").strip())
        if setup_script:
            with step(setup_name):
                run_script(c, setup_name.split()[0].lower(), setup_script, setup_timeout)
        c["budget"], c["dph"] = budget_usd, dph
        yield c, cost
    finally:
        with step("destroy instance"):
            destroy(instance_id)
        print(f"Instance time {(time.time() - t0) / 60:.0f} min ≈ ${cost():.2f} "
              f"at ${dph:.3f}/h (+ small storage/bandwidth)")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    if sys.argv[1:] == ["--cleanup"]:
        cleanup()
    else:
        sys.exit(__doc__)

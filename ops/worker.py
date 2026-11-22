"""Ops dashboard job runner: executes queued jobs from .ops/jobs/ one at a time.

Usage:
    python ops/worker.py            # loop forever (Docker service / host)
    python ops/worker.py --once     # run queued jobs then exit

Jobs are JSON files written by the web app (web/lib/repo.ts):
    {"id", "type", "args", "status": "queued|running|done|failed", "cancel_requested"?, ...}
stdout/stderr of each job go to .ops/logs/<id>.log. Works the same in Docker and on the host
(on the host it can also run Codex image generation and MuseTalk, which need the local logins).
"""
import datetime as dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OPS = ROOT / ".ops"
JOBS, LOGS, POSTERS = OPS / "jobs", OPS / "logs", OPS / "posters"
PY = sys.executable
POLL_SEC = 2


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def read(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write(path: Path, data: dict) -> None:
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def update(path: Path, **fields) -> dict:
    job = read(path) or {}
    job.update(fields)
    write(path, job)
    return job


def episode_path(episode_id: str) -> str:
    series, slug = episode_id.split("/")
    return f"content/{series}/episodes/{slug}"


def command(job: dict) -> list[str]:
    t, a = job["type"], job.get("args", {})
    if t == "new_episode":
        return [PY, "tools/new_episode.py", a["series"], a["slug"], "--mode", a.get("mode", "image")]
    if t == "produce":
        return [PY, "tools/produce.py", episode_path(a["episode"])]
    if t == "catalog":
        return [PY, "tools/catalog.py", a["series"]]
    if t == "publish_fb":
        cmd = [PY, "tools/publish_fb.py", episode_path(a["episode"]), "--at", a["when"]]
        return cmd + (["--dry-run"] if a.get("dry_run") else [])
    if t == "poster":
        series, slug = a["episode"].split("/")
        out = POSTERS / series / f"{slug}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        return ["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", f"output/{series}/{slug}.mp4",
                "-frames:v", "1", "-vf", "scale=270:-2", str(out)]
    raise ValueError(f"unknown job type {t!r}")


def run(path: Path) -> None:
    job = update(path, status="running", started_at=now())
    log_path = LOGS / f"{job['id']}.log"
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8"}
    with log_path.open("a", encoding="utf-8") as log:
        try:
            cmd = command(job)
        except (KeyError, ValueError) as error:
            log.write(f"bad job: {error}\n")
            update(path, status="failed", exit_code=2, finished_at=now())
            return
        log.write("$ " + " ".join(cmd[1:] if cmd[0] == PY else cmd) + "\n")
        log.flush()
        proc = subprocess.Popen(cmd, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, env=env)
        while proc.poll() is None:
            time.sleep(1)
            if (read(path) or {}).get("cancel_requested"):
                log.write("\n[cancelled by user]\n")
                log.flush()
                proc.terminate()
                try:
                    proc.wait(15)
                except subprocess.TimeoutExpired:
                    proc.kill()
        code = proc.wait()
        log.write(f"\n[exit {code}]\n")
    update(path, status="done" if code == 0 else "failed", exit_code=code, finished_at=now())


def queued() -> list[Path]:
    return sorted(p for p in JOBS.glob("*.json") if (read(p) or {}).get("status") == "queued")


def recover() -> None:
    """Jobs left 'running' by a crashed/restarted worker can't be resumed: mark them failed."""
    for p in JOBS.glob("*.json"):
        if (read(p) or {}).get("status") == "running":
            update(p, status="failed", exit_code=-1, finished_at=now())
            with (LOGS / f"{p.stem}.log").open("a", encoding="utf-8") as log:
                log.write("\n[worker restarted - job aborted]\n")


def main() -> None:
    for d in (JOBS, LOGS, POSTERS):
        d.mkdir(parents=True, exist_ok=True)
    recover()
    once = "--once" in sys.argv
    print(f"worker ready (root={ROOT})", flush=True)
    while True:
        jobs = queued()
        for p in jobs:
            if (read(p) or {}).get("status") != "queued":  # cancelled while waiting
                continue
            print(f"run {p.stem}", flush=True)
            run(p)
        if once and not jobs:
            return
        time.sleep(POLL_SEC)


if __name__ == "__main__":
    main()

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
import re
import shutil
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
        if a.get("version"):
            cmd += ["--video", str(history_file(a["episode"], a["version"]))]
        return cmd + (["--dry-run"] if a.get("dry_run") else [])
    if t == "poster":
        series, slug = a["episode"].split("/")
        if a.get("version"):
            video, name = history_file(a["episode"], a["version"]), a["version"]
        else:
            mode = (read(ROOT / episode_path(a["episode"]) / "episode.json") or {}).get("mode", "image")
            video, name = ROOT / "output" / series / f"{slug}-{mode}.mp4", f"current-{mode}"
        out = POSTERS / series / slug / f"{name}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        return ["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", str(video),
                "-frames:v", "1", "-vf", "scale=270:-2", str(out)]
    raise ValueError(f"unknown job type {t!r}")


# ---- render history ---------------------------------------------------------
# Every render of output/<series>/<slug>-<mode>.mp4 is copied to
# output/<series>/history/<slug>/<YYYYMMDD-HHMMSS>-<mode>.mp4 (+ .json with mode, time, duration,
# spoken lines) so older takes survive re-renders and one can be picked for posting.
VERSION_RE = re.compile(r"^\d{8}-\d{6}-(image|video)(-[a-z0-9-]+)?$")
# <slug>-<mode>.mp4, or an experiment <slug>-<mode>-<variant>.mp4 (e.g. -video-infinitetalk-L.mp4)
OUTPUT_RE = re.compile(r"^(\d{3}-\d{4}-\d{2}-\d{2}-[a-z0-9-]+?)-(image|video)(?:-([A-Za-z0-9-]+))?\.mp4$")
THAI = dt.timezone(dt.timedelta(hours=7))
SETTLE_SEC = 15  # skip files still being written


def history_file(episode_id: str, version: str) -> Path:
    if not VERSION_RE.match(version):
        raise ValueError(f"bad version {version!r}")
    series, slug = episode_id.split("/")
    return ROOT / "output" / series / "history" / slug / f"{version}.mp4"


def duration(path: Path) -> float | None:
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                             capture_output=True, text=True, timeout=30).stdout.strip()
        return round(float(out), 1)
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def archive_renders() -> int:
    """Copy new/changed renders into history. Returns how many were archived."""
    count = 0
    for video in (ROOT / "output").glob("*/*.mp4"):
        match = OUTPUT_RE.match(video.name)
        series = video.parent.name
        if not match or not (ROOT / "content" / series / "episodes" / match[1] / "episode.json").exists():
            continue
        slug, mode = match[1], match[2]
        variant = re.sub(r"[^a-z0-9-]", "", (match[3] or "").lower()).strip("-")
        stat = video.stat()
        if time.time() - stat.st_mtime < SETTLE_SEC:
            continue
        folder = video.parent / "history" / slug
        metas = [read(p) or {} for p in folder.glob("*.json")]
        if any(m.get("source", video.name) == video.name and m.get("source_mtime") == int(stat.st_mtime)
               and m.get("size") == stat.st_size for m in metas):
            continue
        version = dt.datetime.fromtimestamp(stat.st_mtime, THAI).strftime("%Y%m%d-%H%M%S") + f"-{mode}" + (f"-{variant}" if variant else "")
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"{version}.mp4"
        shutil.copy2(video, target)
        episode = read(ROOT / "content" / series / "episodes" / slug / "episode.json") or {}
        lines = [s.get("text", "") for s in episode.get("segments", []) if not s.get("skip")]
        write(folder / f"{version}.json", {
            "id": version, "mode": mode, "variant": variant, "source": video.name, "rendered_at": dt.datetime.fromtimestamp(stat.st_mtime, THAI).isoformat(),
            "archived_at": now(), "size": stat.st_size, "source_mtime": int(stat.st_mtime),
            "duration": duration(target), "lines": lines,
        })
        print(f"archived {series}/{slug} {version}", flush=True)
        count += 1
    return count


def after(job: dict, code: int) -> None:
    """Record which render a Facebook post used (publish_fb.py logs the post itself)."""
    a = job.get("args", {})
    if job["type"] != "publish_fb" or code != 0 or a.get("dry_run") or not a.get("version"):
        return
    path = ROOT / episode_path(a["episode"]) / "episode.json"
    episode = read(path) or {}
    posts = episode.get("posts", [])
    for post in reversed(posts):
        if post.get("platform") == "facebook":
            post["version"] = a["version"]
            break
    write(path, episode)


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
    after(job, code)
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
    last_scan = 0.0
    while True:
        if time.time() - last_scan > 10:
            try:
                archive_renders()
            except OSError as error:
                print(f"archive failed: {error}", flush=True)
            last_scan = time.time()
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

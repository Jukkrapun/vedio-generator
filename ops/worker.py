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
import socket
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
    # ---- production pipeline (docs/ops-dashboard/PIPELINE.md) ----
    if t in ("images", "regen_image"):
        return [PY, "tools/images.py", episode_path(a["episode"])]
    if t in ("voice", "regen_voice"):
        return [PY, "tools/tts.py", episode_path(a["episode"])]
    if t == "render":
        return [PY, "tools/render_reel.py", episode_path(a["episode"])]
    if t in ("claude", "revise"):
        return claude_command(a["prompt"] if t == "claude" else revise_prompt(a["episode"], a["note"]))
    raise ValueError(f"unknown job type {t!r}")


# ---- Claude (script writing) ----------------------------------------------------
SCRIPT_GUARD = """

---
(ops dashboard) Write SCRIPTS ONLY. For each clip: create the episode with tools/new_episode.py, then fill
episode.json, script.md and publish.md following CLAUDE.md and the series' series.md (read catalog.md and
ideas.md first, avoid repeating topics). Do NOT generate images, run TTS, render, or post anything - the user
reviews every stage in the web dashboard. Reply in Thai with the episode folder names you created."""


def revise_prompt(episode_id: str, note: str) -> str:
    return (f"Revise the script of episode {episode_path(episode_id)} (episode.json segments text/cards/"
            f"image_prompt, script.md and publish.md) as follows:\n{note}\n\nKeep the series rules. "
            "Only edit files in that episode folder. Do NOT generate images, run TTS, render or post. "
            "Reply in Thai with a short summary of what changed.")


def claude_command(prompt: str) -> list[str]:
    exe = shutil.which("claude")
    if not exe:
        raise ValueError("claude CLI not found - run the worker on the host (ops/start-worker.ps1)")
    tools = ["Read", "Write", "Edit", "Glob", "Grep"]
    for py in (".venv/Scripts/python.exe", ".venv\\Scripts\\python.exe", "python"):
        for script in ("tools/new_episode.py", "tools/catalog.py"):
            tools += [f"Bash({py} {script}:*)", f"PowerShell({py} {script}:*)"]
    return [exe, "-p", prompt + (SCRIPT_GUARD if "new_episode" not in prompt else ""),
            "--permission-mode", "acceptEdits", "--allowedTools", *tools,
            "--disallowedTools", "WebFetch", "WebSearch"]


def episode_dirs() -> set[str]:
    return {f"{p.parent.parent.name}/{p.name}" for p in (ROOT / "content").glob("*/episodes/*") if (p / "episode.json").exists()}


def prepare(job: dict, log) -> None:
    """File changes a job needs before its command runs."""
    t, a = job["type"], job.get("args", {})
    if t == "regen_image":
        ep_dir = ROOT / episode_path(a["episode"])
        episode = read(ep_dir / "episode.json") or {}
        seg = next(s for s in episode["segments"] if s.get("id") == a["segment"])
        if a.get("prompt"):
            seg["image_prompt"] = a["prompt"]
            write(ep_dir / "episode.json", episode)
        image = ep_dir / seg["image"]
        if image.exists():
            old = image.parent / "_old" / f"{image.stem}-{time.strftime('%Y%m%d-%H%M%S')}{image.suffix}"
            old.parent.mkdir(exist_ok=True)
            # other segments may share this file - copy, then remove the original so images.py makes a new one
            shutil.copy2(image, old)
            image.unlink()
            log.write(f"old image kept as {old.relative_to(ep_dir)}\n")
    if t == "regen_voice":
        ep_dir = ROOT / episode_path(a["episode"])
        episode = read(ep_dir / "episode.json") or {}
        for i, seg in enumerate(episode["segments"]):
            if seg.get("id") != a["segment"]:
                continue
            if a.get("text"):
                seg["text"] = a["text"]
                write(ep_dir / "episode.json", episode)
            for f in (ep_dir / "audio").glob(f"{i:02d}-{seg['id']}.*"):
                f.unlink()
            log.write(f"cleared cached audio for segment {seg['id']}\n")


def after_claude(job: dict, before: set[str]) -> None:
    """Tag episodes the Claude job created with their order and the first review stage."""
    new = sorted(episode_dirs() - before)
    for ep in new:
        path = ROOT / episode_path(ep) / "episode.json"
        episode = read(path) or {}
        episode["review"] = {"stage": "script", "order": job["args"].get("order", "")}
        write(path, episode)
    order_file = OPS / "orders" / f"{job['args'].get('order', '')}.json"
    if new and order_file.exists():
        order = read(order_file) or {}
        order["episodes"] = sorted(set(order.get("episodes", [])) | set(new))
        write(order_file, order)


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
        shown = " ".join(cmd[1:] if cmd[0] == PY else cmd)
        log.write("$ " + (shown[:300] + " ..." if len(shown) > 300 else shown) + "\n")
        try:
            prepare(job, log)
        except (OSError, KeyError, StopIteration, ValueError) as error:
            log.write(f"prepare failed: {error!r}\n")
            update(path, status="failed", exit_code=2, finished_at=now())
            return
        before = episode_dirs() if job["type"] == "claude" else set()
        log.flush()
        proc =subprocess.Popen(cmd, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, env=env)
        while proc.poll() is None:
            time.sleep(1)
            heartbeat()
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
    if job["type"] == "claude":
        after_claude(job, before)  # also on failure: keep whatever episodes were written
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


# ---- single active worker -------------------------------------------------------
# Docker and host workers may both be up; only the one holding .ops/worker.json (fresh heartbeat) runs jobs.
WORKER_FILE = OPS / "worker.json"
ME = f"{socket.gethostname()}:{os.getpid()}"
STALE_SEC = 30


def heartbeat() -> bool:
    """Claim/refresh the active-worker slot. False while another live worker holds it."""
    other = read(WORKER_FILE) or {}
    if other.get("id") not in (None, ME) and time.time() - other.get("ts", 0) < STALE_SEC:
        return False
    write(WORKER_FILE, {"id": ME, "ts": time.time(), "kind": "docker" if Path("/.dockerenv").exists() else "host",
                        "claude": bool(shutil.which("claude")), "codex": bool(shutil.which("codex"))})
    return True


def main() -> None:
    for d in (JOBS, LOGS, POSTERS, OPS / "orders"):
        d.mkdir(parents=True, exist_ok=True)
    once = "--once" in sys.argv
    print(f"worker {ME} ready (root={ROOT})", flush=True)
    last_scan, active = 0.0, False
    while True:
        if not heartbeat():
            if active:
                print("another worker took over - standing by", flush=True)
            active = False
            time.sleep(5)
            continue
        if not active:
            print("active worker", flush=True)
            recover()
            active = True
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
            heartbeat()
        if once and not jobs:
            return
        time.sleep(POLL_SEC)


if __name__ == "__main__":
    main()

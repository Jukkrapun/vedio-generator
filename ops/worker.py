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
import uuid
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
    """Atomic write. On Windows os.replace fails with "Access is denied" while another process (the web
    container via the bind mount, antivirus, an editor) has the target open - retry briefly instead of crashing."""
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for attempt in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            time.sleep(0.05 * (attempt + 1))
    tmp.unlink(missing_ok=True)
    raise PermissionError(f"could not replace {path} (file kept open by another process)")


def update(path: Path, **fields) -> dict:
    job = read(path) or {}
    job.update(fields)
    write(path, job)
    return job


def series_path(series: str) -> str:
    """Web series key -> folder under content/ and output/: "poc.sound" -> "poc/sound" (nested series)."""
    return series.replace(".", "/")


def episode_path(episode_id: str) -> str:
    series, slug = episode_id.split("/")
    return f"content/{series_path(series)}/episodes/{slug}"


def command(job: dict) -> list[str]:
    t, a = job["type"], job.get("args", {})
    if t == "new_episode":
        return [PY, "tools/new_episode.py", series_path(a["series"]), a["slug"], "--mode", a.get("mode", "image")]
    if t == "produce":
        return [PY, "tools/produce.py", episode_path(a["episode"])]
    if t == "catalog":
        return [PY, "tools/catalog.py", series_path(a["series"])]
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
            video, name = ROOT / "output" / series_path(series) / f"{slug}-{mode}.mp4", f"current-{mode}"
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
        # long-form story mode builds its voice per language inside render_story.py
        story = (read(ROOT / episode_path(a["episode"]) / "episode.json") or {}).get("mode") == "story"
        return [PY, "tools/render_story.py" if story else "tools/render_reel.py", episode_path(a["episode"])]
    if t == "voice_samples":  # characters page: one ElevenLabs line per emotion in character.json "samples"
        return [PY, "tools/voice_samples.py", a["character"]]
    if t in ("claude", "revise"):
        if t == "claude":
            return claude_command(a["prompt"], session=job_session(job))
        return claude_command(revise_prompt(a["episode"], a["note"]), guard=False,
                              session=job_session(job), resume=episode_session(a["episode"]))
    raise ValueError(f"unknown job type {t!r}")


# ---- Claude (script writing) ----------------------------------------------------
SCRIPT_GUARD = """

---
(ops dashboard) Write SCRIPTS ONLY. For each clip: create the episode with tools/new_episode.py, then fill
episode.json, script.md and publish.md following CLAUDE.md and the series' series.md (read catalog.md and
ideas.md first, avoid repeating topics). """ + "{TH}" + """ Do NOT generate images, run TTS, render, or post
anything - the user reviews every stage in the web dashboard. Reply in Thai with the episode folder names you created."""
# image prompts stay English for Codex; the user reviews them in Thai (decided 2026-11-24)
THAI_PROMPTS = ("Every segment with an English \"image_prompt\" also gets \"image_prompt_th\": a faithful Thai "
                "translation of that prompt (same content, natural Thai) for the user to read in the dashboard.")
# Project skills (.claude/skills/) for the web's Claude jobs - CLAUDE.md "Writing & editing skills".
# Their SKILL.md texts go into the system prompt (--append-system-prompt-file): identical in every job, so the
# prompt cache covers them, and Claude never has to call the Skill tool.
SKILL_NAMES = ("story-hook-framework", "vertical-edit-techniques", "art-director")
SKILLS_FILE = OPS / "skills-prompt.md"
SKILLS = ("The project skills story-hook-framework (story/script), vertical-edit-techniques (segments/cards/pacing) "
          "and art-director (the look and every image_prompt: pick the look from the content, avoid repeating recent "
          "episodes, follow shared/brand/style-bible.md, reuse characters from shared/characters/ via the "
          "\"characters\"/\"narrator\"/\"style_anchor\" keys) are already in your system prompt - follow them, "
          "no need to load them again. The series' series.md and the channel tone win over the skills.")


def skills_prompt() -> Path:
    """Write the skills' SKILL.md texts to one file (only when they changed, so the cached prefix stays stable)."""
    parts = ["# Project skills (preloaded by the ops worker)\n"]
    for name in SKILL_NAMES:
        text = (ROOT / ".claude" / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
        parts.append(f'\n\n<skill name="{name}">\n{text.strip()}\n</skill>')
    text = "".join(parts) + "\n"
    if not SKILLS_FILE.exists() or SKILLS_FILE.read_text(encoding="utf-8") != text:
        SKILLS_FILE.parent.mkdir(parents=True, exist_ok=True)
        SKILLS_FILE.write_text(text, encoding="utf-8")
    return SKILLS_FILE


# ---- Claude sessions: one per order, reused by later script revisions of its episodes ----
def job_session(job: dict) -> str:
    """Stable session id for a job (so after_claude can record it without parsing output)."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "tonteesong-job:" + job["id"]))


def session_exists(sid: str) -> bool:
    base = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude") / "projects"
    return any(base.glob(f"*/{sid}.jsonl"))


def episode_session(episode_id: str) -> str | None:
    """Session that wrote/last revised this episode, if Claude can still resume it."""
    sid = ((read(ROOT / episode_path(episode_id) / "episode.json") or {}).get("review") or {}).get("session")
    return sid if sid and session_exists(sid) else None


def record_session(episode_id: str, sid: str) -> None:
    path = ROOT / episode_path(episode_id) / "episode.json"
    episode = read(path)
    if episode is None or (episode.get("review") or {}).get("session") == sid:
        return
    episode["review"] = {**(episode.get("review") or {}), "session": sid}
    write(path, episode)


SCRIPT_GUARD = SCRIPT_GUARD.replace("{TH}", THAI_PROMPTS + " " + SKILLS)


def revise_prompt(episode_id: str, note: str) -> str:
    return (f"Revise the script of episode {episode_path(episode_id)} (episode.json segments text/cards/"
            f"image_prompt, script.md and publish.md) as follows:\n{note}\n\nKeep the series rules. "
            f"{THAI_PROMPTS} {SKILLS} Keep image_prompt and image_prompt_th in sync whenever either changes. "
            "Only edit files in that episode folder. Do NOT generate images, run TTS, render or post. "
            "Reply in Thai with a short summary of what changed.")


def claude_command(prompt: str, guard: bool = True, session: str | None = None, resume: str | None = None) -> list[str]:
    """resume = continue that session (keeps its context + recorded system prompt); else start `session` (or a new one)."""
    exe = shutil.which("claude")
    if not exe:
        raise ValueError("claude CLI not found - run the worker on the host (ops/start-worker.ps1)")
    tools = ["Read", "Write", "Edit", "Glob", "Grep"]
    for py in (".venv/Scripts/python.exe", ".venv\\Scripts\\python.exe", "python"):
        for script in ("tools/new_episode.py", "tools/catalog.py"):
            tools += [f"Bash({py} {script}:*)", f"PowerShell({py} {script}:*)"]
    where = ["--resume", resume] if resume else ["--session-id", session or str(uuid.uuid4())]
    return [exe, "-p", prompt + (SCRIPT_GUARD if guard else ""), *where,
            "--append-system-prompt-file", str(skills_prompt()),
            "--permission-mode", "acceptEdits", "--allowedTools", *tools,
            "--disallowedTools", "WebFetch", "WebSearch"]


def translate_prompt(thai: str, style: str) -> str:
    """Thai image description -> English image-generation prompt (one short claude -p call, no tools)."""
    ask = ("Translate this Thai image description into a concise English image-generation prompt. Keep every "
           "concrete detail (subject, setting, light, camera angle, mood). Do not add style words already covered by "
           f"this shared style: {style!r}. Output ONLY the English prompt, one line, no quotes.\n\nThai: {thai}")
    exe = shutil.which("claude")
    if not exe:
        raise ValueError("claude CLI not found - run the worker on the host")
    out = subprocess.run([exe, "-p", ask, "--disallowedTools", "Bash", "Write", "Edit", "WebFetch", "WebSearch"],
                         cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=300)
    english = out.stdout.strip().strip('"').splitlines()[-1].strip() if out.stdout.strip() else ""
    if out.returncode or not english:
        raise ValueError(f"translation failed: {out.stderr[-300:]}")
    return english


def episode_dirs() -> set[str]:
    found = set()
    for pattern in ("*/episodes/*", "*/*/episodes/*"):  # top-level and nested series
        for p in (ROOT / "content").glob(pattern):
            if (p / "episode.json").exists():
                series = p.parent.parent.relative_to(ROOT / "content").as_posix().replace("/", ".")
                found.add(f"{series}/{p.name}")
    return found


def render_note_prompt(episode_id: str, note: str) -> str:
    return (f"Before re-rendering episode {episode_path(episode_id)}, adjust its episode.json as the user asks:\n{note}\n\n"
            "Change render settings (subtitles, cards, parallax/motion, music, pause_sec, skip on segments, voice_settings, "
            "per-segment image/visual) per CLAUDE.md and the series' series.md, using the vertical-edit-techniques skill "
            "(and art-director if the look/images change). Only change spoken text if the user asks for it "
            "(new text = new TTS credits). Only edit files in that episode folder. Do NOT render, generate images, run TTS or "
            "post - the worker renders right after you. Reply in Thai with a short summary of what changed.")


def prepare(job: dict, log) -> None:
    """File changes a job needs before its command runs."""
    t, a = job["type"], job.get("args", {})
    if t == "render" and str(a.get("note", "")).strip():
        # user's instructions for this re-render: Claude edits episode.json first, then the normal render runs
        log.write("--- Claude: adjusting episode.json for this render ---\n")
        log.flush()
        resume = episode_session(a["episode"])
        if resume:
            log.write(f"(continuing Claude session {resume})\n")
        done = subprocess.run(claude_command(render_note_prompt(a["episode"], a["note"]), guard=False,
                                             session=job_session(job), resume=resume), cwd=ROOT,
                              stdout=log, stderr=subprocess.STDOUT, timeout=1800)
        if done.returncode:
            raise ValueError(f"Claude could not apply the render note (exit {done.returncode})")
        record_session(a["episode"], resume or job_session(job))
        log.write("\n--- render ---\n")
        log.flush()
    if t == "regen_image":
        ep_dir = ROOT / episode_path(a["episode"])
        episode = read(ep_dir / "episode.json") or {}
        seg = next(s for s in episode["segments"] if s.get("id") == a["segment"])
        if a.get("prompt_th") and a["prompt_th"].strip() != seg.get("image_prompt_th", "").strip():
            seg["image_prompt_th"] = a["prompt_th"].strip()
            seg["image_prompt"] = translate_prompt(a["prompt_th"], episode.get("image_style", ""))
            log.write(f"Thai prompt translated -> {seg['image_prompt']}\n")
            write(ep_dir / "episode.json", episode)
        elif a.get("prompt"):
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
        episode["review"] = {"stage": "script", "order": job["args"].get("order", ""), "session": job_session(job)}
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
VERSION_RE = re.compile(r"^\d{8}-\d{6}-(image|video|story)(-[a-z0-9-]+)?$")
# <slug>-<mode>.mp4, an experiment <slug>-<mode>-<variant>.mp4 (e.g. -video-infinitetalk-L.mp4),
# or a long-form story per language <slug>-story-<lang>.mp4 (variant = th / en)
OUTPUT_RE = re.compile(r"^(\d{3}-\d{4}-\d{2}-\d{2}-[a-z0-9-]+?)-(image|video|story)(?:-([A-Za-z0-9-]+))?\.mp4$")
THAI = dt.timezone(dt.timedelta(hours=7))
SETTLE_SEC = 15  # skip files still being written


def history_file(episode_id: str, version: str) -> Path:
    if not VERSION_RE.match(version):
        raise ValueError(f"bad version {version!r}")
    series, slug = episode_id.split("/")
    return ROOT / "output" / series_path(series) / "history" / slug / f"{version}.mp4"


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
    videos = [*(ROOT / "output").glob("*/*.mp4"), *(ROOT / "output").glob("*/*/*.mp4")]  # + nested series
    for video in videos:
        match = OUTPUT_RE.match(video.name)
        series_dir = video.parent.relative_to(ROOT / "output").as_posix()
        series = series_dir.replace("/", ".")
        if "history" in series_dir.split("/") or not match or not (ROOT / "content" / series_dir / "episodes" / match[1] / "episode.json").exists():
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
        episode = read(ROOT / "content" / series_dir / "episodes" / slug / "episode.json") or {}
        # story mode keeps text per language ({"th": ..., "en": ...}); the take's variant is the language
        lines = [s["text"].get(variant) or next(iter(s["text"].values()), "") if isinstance(s.get("text"), dict) else s.get("text", "")
                 for s in episode.get("segments", []) if not s.get("skip")]
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
    if job["type"] == "revise" and code == 0:
        # a resumed session keeps its id; a fresh one (old episode, or session gone) becomes the episode's session
        record_session(job["args"]["episode"], episode_session(job["args"]["episode"]) or job_session(job))
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
    try:
        write(WORKER_FILE, {"id": ME, "ts": time.time(), "kind": "docker" if Path("/.dockerenv").exists() else "host",
                            "claude": bool(shutil.which("claude")), "codex": bool(shutil.which("codex"))})
    except OSError as error:  # a missed heartbeat is harmless (next one in a few seconds); never kill a job over it
        print(f"heartbeat skipped: {error}", flush=True)
    return True


RELOAD_EXIT = 3  # start-worker.ps1 relaunches the worker on this exit code


def main() -> None:
    for d in (JOBS, LOGS, POSTERS, OPS / "orders"):
        d.mkdir(parents=True, exist_ok=True)
    once = "--once" in sys.argv
    print(f"worker {ME} ready (root={ROOT})", flush=True)
    last_scan, active = 0.0, False
    code_mtime = Path(__file__).stat().st_mtime
    while True:
        # code updated (e.g. a new job feature): exit between jobs; start-worker.ps1 relaunches with the new code
        if Path(__file__).stat().st_mtime != code_mtime:
            print("worker.py changed - restarting with the new code", flush=True)
            WORKER_FILE.unlink(missing_ok=True)  # let the relaunched worker take over at once
            sys.exit(RELOAD_EXIT)
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

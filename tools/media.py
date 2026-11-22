"""Shared constants and ffmpeg helpers for the reel pipeline."""
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _ensure_ffmpeg_on_path() -> None:
    """ffmpeg (winget Gyan.FFmpeg) is on PowerShell's PATH but not on Git Bash's / some IDE shells'.
    If ffmpeg/ffprobe aren't found, add the winget install dir (or FFMPEG_DIR) to PATH for this process
    and its subprocesses, so every tool works from any shell (2026-11-22: catalog showed '?' durations)."""
    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        return
    candidates = [Path(os.environ["FFMPEG_DIR"])] if os.environ.get("FFMPEG_DIR") else []
    winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    candidates += sorted(winget.glob("Gyan.FFmpeg*/ffmpeg-*/bin"), reverse=True)  # newest version first
    for d in candidates:
        if (d / "ffprobe.exe").exists() or (d / "ffprobe").exists():
            os.environ["PATH"] = f"{d}{os.pathsep}{os.environ.get('PATH', '')}"
            return
    raise RuntimeError("ffmpeg/ffprobe not found: install with `winget install Gyan.FFmpeg` or set FFMPEG_DIR")


_ensure_ffmpeg_on_path()
WIDTH, HEIGHT, FPS = 1080, 1920, 30
MAX_DURATION_SEC = 90
FFMPEG_TIMEOUT_SEC = 300


def run(cmd: list[str], cwd: Path | None = None) -> str:
    if cmd[0] == "ffmpeg":
        cmd = [cmd[0], "-nostdin", *cmd[1:]]  # never wait on inherited stdin (caused hangs)
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
        stdin=subprocess.DEVNULL, timeout=FFMPEG_TIMEOUT_SEC,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd[:3])}...\n{result.stderr[-2000:]}")
    return result.stdout


def probe_duration(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.strip())


def host_look(host: dict) -> dict:
    """Resolve the host's look for an episode -> {"scene": Path, "base_video": Path | None, "name": str}.

    New style:  "host": {"character": "baitoey", "look": "<name>"}
                -> shared/characters/<character>/looks/<name>/scene.png (+ base.mp4 if present)
    Old style:  "host": {"scene": "...png", "base_video": "...mp4"} (still supported).
    Explicit "scene"/"base_video" keys always override the look's files.
    """
    look = host.get("look")
    scene = base = None
    if look:
        folder = ROOT / "shared" / "characters" / host.get("character", "baitoey") / "looks" / look
        if not folder.is_dir():
            raise FileNotFoundError(f"Look not found: {folder}")
        scene = folder / "scene.png"
        base = folder / "base.mp4" if (folder / "base.mp4").exists() else None
    if host.get("scene"):
        scene = ROOT / host["scene"]
    if host.get("base_video"):
        base = ROOT / host["base_video"]
    if scene is None:
        raise ValueError('episode.json "host" needs "look" (or "scene")')
    return {"scene": scene, "base_video": base, "name": look or scene.stem}


def output_path(episode_dir: Path, mode: str | None = None) -> Path:
    """Rendered video: output/<series>/<episode>-<mode>.mp4 (one file per mode, side by side).
    mode defaults to the episode's current "mode" in episode.json."""
    if mode is None:
        import json
        mode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8")).get("mode", "image")
    return ROOT / "output" / episode_dir.parent.parent.name / f"{episode_dir.name}-{mode}.mp4"

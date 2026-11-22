"""Shared constants and ffmpeg helpers for the reel pipeline."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
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

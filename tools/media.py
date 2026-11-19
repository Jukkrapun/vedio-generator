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

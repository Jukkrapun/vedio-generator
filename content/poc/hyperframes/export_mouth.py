"""Write a per-frame mouth-open envelope (0..1) from an audio file as mouth.js.

Usage: .venv/Scripts/python.exe content/poc/hyperframes/export_mouth.py <audio> <out.js> [--fps 30] [--seconds N]
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "tools"))
import media  # noqa: E402,F401  (puts ffmpeg on PATH)

SR = 16000


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--seconds", type=float)
    a = ap.parse_args()

    cmd = ["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    if a.seconds:
        cmd[3:3] = ["-t", str(a.seconds)]
    pcm = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float32)

    hop = SR // a.fps
    n = len(pcm) // hop
    rms = np.sqrt((pcm[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    level = np.clip(rms / (np.percentile(rms, 95) + 1e-6), 0, 1)
    level[level < 0.12] = 0  # silence gate
    # attack fast, release slower -> less jittery jaw
    out, prev = [], 0.0
    for v in level:
        prev = v if v > prev else prev * 0.6 + v * 0.4
        out.append(round(float(prev), 3))

    Path(a.out).write_text(f"window.MOUTH = {{fps: {a.fps}, v: {out}}};\n", encoding="utf-8")
    print(f"{len(out)} frames -> {a.out}")


if __name__ == "__main__":
    main()

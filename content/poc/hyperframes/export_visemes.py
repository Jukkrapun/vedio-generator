"""Per-frame mouth data for a VRM: loudness envelope + Thai-vowel viseme (aa/ih/ou/ee/oh).

Loudness comes from the audio (how wide), the viseme from the ElevenLabs character
alignment of each segment (which shape): the latest vowel spoken within 0.25 s.

Usage: .venv/Scripts/python.exe content/poc/hyperframes/export_visemes.py <episode> <out.js> [--seconds N]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "tools"))
import media  # noqa: E402,F401  (puts ffmpeg on PATH)

SR, FPS = 16000, 30
VOWELS = {
    "aa": "าะัำ",
    "ih": "ิีึื",
    "ou": "ุู",
    "ee": "เแ็",
    "oh": "โอ",
}
CHAR2VIS = {c: v for v, cs in VOWELS.items() for c in cs}


def envelope(audio: Path, seconds: float | None) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", str(audio)] + (["-t", str(seconds)] if seconds else []) + \
          ["-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    pcm = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float32)
    hop = SR // FPS
    n = len(pcm) // hop
    rms = np.sqrt((pcm[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    level = np.clip(rms / (np.percentile(rms, 95) + 1e-6), 0, 1)
    level[level < 0.12] = 0
    out, prev = np.zeros(n), 0.0
    for i, v in enumerate(level):
        prev = v if v > prev else prev * 0.6 + v * 0.4
        out[i] = prev
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("out")
    ap.add_argument("--seconds", type=float)
    a = ap.parse_args()
    ep = Path(a.episode)

    env = envelope(ep / "audio" / "voice.mp3", a.seconds)
    timeline = json.loads((ep / "audio" / "timeline.json").read_text(encoding="utf-8"))
    events = []  # (time, viseme)
    for seg in timeline["segments"]:
        if seg.get("align") and (ep / "audio" / seg["align"]).exists():
            for ch, t in json.loads((ep / "audio" / seg["align"]).read_text(encoding="utf-8")):
                if ch in CHAR2VIS:
                    events.append((seg["start"] + t, CHAR2VIS[ch]))
    events.sort()

    vis, j, cur, cur_t = [], 0, "aa", -9.0
    for f in range(len(env)):
        t = f / FPS
        while j < len(events) and events[j][0] <= t + 0.04:  # small lead: mouth shapes before the sound
            cur_t, cur = events[j]
            j += 1
        vis.append(cur if t - cur_t < 0.25 else "aa")

    data = {"fps": FPS, "open": [round(float(v), 3) for v in env], "vis": vis}
    Path(a.out).write_text("window.MOUTH = " + json.dumps(data) + ";\n", encoding="utf-8")
    from collections import Counter
    print(f"{len(env)} frames, visemes {dict(Counter(v for v, o in zip(vis, env) if o > 0))} -> {a.out}")


if __name__ == "__main__":
    main()

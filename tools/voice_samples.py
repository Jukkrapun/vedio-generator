"""Render one sample line per emotion for a character, to check a voice before saving it.

Usage:
    python tools/voice_samples.py <character> [--voice <id>] [--model <model>]

Lines come from character.json -> "samples": {"<emotion>": "<Thai line, may include [audio tags]>"}.
Output: shared/characters/<name>/voice-samples/<emotion>.mp3.
Costs ElevenLabs credits (a few hundred characters).
"""
import argparse
from pathlib import Path

from dotenv import load_dotenv

from characters import CHAR_DIR, load
from media import ROOT
from tts import synthesize


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("character")
    ap.add_argument("--voice")
    ap.add_argument("--model")
    a = ap.parse_args()
    load_dotenv(ROOT / ".env")
    ch = load(a.character)
    cfg = dict(ch.get("voice", {}))
    if a.voice:
        cfg["voice"] = a.voice
    if a.model:
        cfg["model"] = a.model
    samples = ch.get("samples") or {}
    if not samples:
        raise SystemExit(f'no "samples" in {a.character}/character.json')
    out = CHAR_DIR / a.character / "voice-samples"
    out.mkdir(exist_ok=True)
    for emotion, line in samples.items():
        path = out / f"{emotion}.mp3"
        primary = synthesize(cfg, line, path)
        print(f"{path.relative_to(ROOT)}{'' if primary else '  (FALLBACK voice — primary failed)'}")


if __name__ == "__main__":
    main()

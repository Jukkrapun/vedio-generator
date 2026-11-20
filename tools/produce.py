"""One command to produce an episode, following its "mode" in episode.json.

Usage:
    python tools/produce.py content/<series>/episodes/<episode>

Modes:
  "image" (default) - Codex images per segment (+ slow zoom) + voice + word-by-word subtitles.
                      Cheapest: ElevenLabs voice credits + Codex quota, no lip-sync cost.
  "video"           - host base video lip-synced to the voice (Sync on fal, $1-1.70/clip)
                      + voice + subtitles. Segments may still cut to images ("visual": "image").
Every step is cached/skipped when its inputs are unchanged, so re-running is cheap.
"""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from images import generate_images
from lipsync import lipsync
from catalog import build_catalog
from media import ROOT
from render_reel import render
from tts import build_voice

MODES = ("image", "video")


def produce(episode_dir: Path) -> Path:
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    mode = episode.get("mode", "image")
    if mode not in MODES:
        raise ValueError(f'"mode" must be one of {MODES}, got {mode!r}')
    print(f"== {episode_dir.name} [{mode} mode]")
    generate_images(episode_dir)  # image mode: all segments; video mode: B-roll segments only
    build_voice(episode_dir)
    if mode == "video":
        lipsync(episode_dir)
    video = render(episode_dir)
    build_catalog(episode_dir.parent.parent.name)  # content/<series>/episodes/<episode>
    return video


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    produce(Path(sys.argv[1]).resolve())

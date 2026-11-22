"""One command to produce episodes, following each one's "mode" in episode.json.

Usage:
    python tools/produce.py <episode> [<episode> ...]

Several episodes = one batch: images + voice for all, then ONE lip-sync batch (all MuseTalk clips
on a single rented vast.ai instance, destroyed at the end), then render each.

Modes:
  "image" (default) - Codex images per segment (+ slow zoom) + voice + word-by-word subtitles.
  "video"           - host look lip-synced to the voice (MuseTalk on vast.ai, or Sync on fal)
                      + voice + subtitles. Segments may still cut to images ("visual": "image").
Every step is cached/skipped when its inputs are unchanged, so re-running is cheap.
"""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from catalog import build_catalog
from images import generate_images
from lipsync import lipsync_many
from media import ROOT
from render_reel import render
from timing import report, step
from tts import build_voice

MODES = ("image", "video")


def load(episode_dir: Path) -> dict:
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    if episode.get("mode", "image") not in MODES:
        raise ValueError(f'"mode" must be one of {MODES}, got {episode.get("mode")!r}')
    return episode


def produce_many(episode_dirs: list[Path]) -> list[Path]:
    episodes = {d: load(d) for d in episode_dirs}
    try:
        for d, ep in episodes.items():
            print(f"== {d.name} [{ep.get('mode', 'image')} mode]")
            with step(f"images {d.name[:3]}"):
                generate_images(d)  # image mode: all segments; video mode: B-roll segments only
            with step(f"voice {d.name[:3]}"):
                build_voice(d)
        video_dirs = [d for d, ep in episodes.items() if ep.get("mode") == "video"]
        if video_dirs:
            with step(f"lip-sync total ({len(video_dirs)} episode(s))"):
                lipsync_many(video_dirs)
        videos = []
        for d in episode_dirs:
            with step(f"render {d.name[:3]}"):
                videos.append(render(d))
        for series in dict.fromkeys(d.parent.parent.name for d in episode_dirs):  # content/<series>/episodes/<ep>
            build_catalog(series)
        return videos
    finally:
        report()


def produce(episode_dir: Path) -> Path:
    return produce_many([episode_dir])[0]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    produce_many([Path(a).resolve() for a in sys.argv[1:]])

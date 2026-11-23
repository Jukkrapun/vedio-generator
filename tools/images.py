"""Generate missing segment images with Codex (image mode / B-roll).

Usage:
    python tools/images.py content/<series>/episodes/<episode>

For every segment with "image_prompt" whose "image" file does not exist yet, asks Codex for one
vertical image (all missing images in a single Codex run) and copies the results into place.
Optional episode-level "image_style" is appended to every prompt so the clip looks consistent.
Existing images are never regenerated — delete a file to redo it.
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from media import ROOT

CODEX_GENERATED = Path.home() / ".codex" / "generated_images"
CODEX_TIMEOUT_SEC = 1200
BASE_RULES = ("photorealistic, vertical portrait 1024x1536, no text, no letters, no logos, no watermarks, "
              "no recognizable real people or celebrities, calm empty area in the middle for subtitles")


STORY_RULES = ("photorealistic, horizontal landscape 1536x1024 (16:9 framing), no text, no letters, no logos, "
               "no watermarks, no recognizable real people or celebrities, calm darker lower third for subtitles")


def missing_images(episode: dict, episode_dir: Path) -> list[dict]:
    return [s for s in episode["segments"]
            if s.get("image_prompt") and s.get("image") and not (episode_dir / s["image"]).exists()]


def codex_prompt(segments: list[dict], style: str, rules: str = BASE_RULES) -> str:
    items = "\n".join(f"Image {i}: {s['image_prompt']}" for i, s in enumerate(segments, start=1))
    return (f"Use your image generation tool to create {len(segments)} separate images, in this exact order. "
            f"Every image: {rules}. Shared style for all: {style or 'soft warm cinematic film look'}.\n"
            f"{items}\nGenerate them one by one and report the saved file paths in order.")


def generate_images(episode_dir: Path) -> list[Path]:
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    todo = missing_images(episode, episode_dir)
    # Story mode: several segments may share one image -> ask for each file once
    seen: set[str] = set()
    todo = [s for s in todo if not (s["image"] in seen or seen.add(s["image"]))]
    rules = STORY_RULES if episode.get("mode") == "story" else BASE_RULES
    if not todo:
        print("Images: all present")
        return []
    print(f"Images: generating {len(todo)} with Codex (a few minutes each) ...")
    started = time.time()
    codex = shutil.which("codex")
    if not codex:
        raise RuntimeError("codex CLI not found on PATH")
    # Prompt goes through stdin ("-"): on Windows codex is a .cmd shim and cmd.exe cuts
    # command-line arguments at the first newline.
    result = subprocess.run(
        [codex, "exec", "--skip-git-repo-check", "-"],
        input=codex_prompt(todo, episode.get("image_style", ""), rules),
        capture_output=True, text=True, encoding="utf-8", timeout=CODEX_TIMEOUT_SEC,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Codex failed: {result.stderr[-1500:]}")
    new_files = sorted((p for p in CODEX_GENERATED.rglob("*.png") if p.stat().st_mtime > started),
                       key=lambda p: p.stat().st_mtime)
    if len(new_files) < len(todo):
        raise RuntimeError(f"Codex produced {len(new_files)} of {len(todo)} images — run again to fill the rest")
    written = []
    for seg, src in zip(todo, new_files):
        dst = episode_dir / seg["image"]
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dst)
        written.append(dst)
        print(f"  {dst.relative_to(ROOT)}")
    return written


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    generate_images(Path(sys.argv[1]).resolve())

"""Create the next numbered episode folder from the series template.

Usage:
    python tools/new_episode.py <series> <slug> [--mode image|video]

Example:
    python tools/new_episode.py love-quotes first-heartbreak
    -> content/love-quotes/episodes/006-2026-11-20-first-heartbreak/

Episode folders are named NNN-YYYY-MM-DD-<slug>: NNN is a running number per series so the
production order is obvious; rendered files in output/<series>/ reuse the same name.
"""
import datetime
import json
import re
import shutil
import sys
from pathlib import Path

from media import ROOT

NUMBER_RE = re.compile(r"^(\d{3})-")
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def next_number(episodes_dir: Path) -> int:
    numbers = [int(m.group(1)) for p in episodes_dir.iterdir() if p.is_dir() and (m := NUMBER_RE.match(p.name))]
    return max(numbers, default=0) + 1


def new_episode(series: str, slug: str, mode: str | None = None) -> Path:
    if not SLUG_RE.match(slug):
        raise ValueError(f"slug must be lowercase kebab-case (a-z, 0-9, -): {slug!r}")
    series_dir = ROOT / "content" / series
    template, episodes_dir = series_dir / "_template", series_dir / "episodes"
    if not template.is_dir():
        raise FileNotFoundError(f"No template for series '{series}': {template}")
    episodes_dir.mkdir(exist_ok=True)
    name = f"{next_number(episodes_dir):03d}-{datetime.date.today():%Y-%m-%d}-{slug}"
    target = episodes_dir / name
    shutil.copytree(template, target, ignore=shutil.ignore_patterns(".gitkeep"))
    if mode:
        ep_file = target / "episode.json"
        episode = json.loads(ep_file.read_text(encoding="utf-8"))
        ep_file.write_text(json.dumps({**episode, "mode": mode}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(target.relative_to(ROOT))
    return target


if __name__ == "__main__":
    argv = sys.argv[1:]
    mode = argv[argv.index("--mode") + 1] if "--mode" in argv else None
    positional = [a for a in argv if not a.startswith("--") and a != mode]
    if len(positional) != 2 or mode not in (None, "image", "video"):
        sys.exit(__doc__)
    new_episode(positional[0], positional[1], mode)

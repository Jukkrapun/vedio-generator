"""Reusable characters: shared/characters/<name>/character.json (machine side of persona.md).

character.json:
  {"name": "...", "image_block": "<EN character block>", "refs": ["reference/sheet.png", ...],
   "voice": {"tts": "elevenlabs", "voice": "<id>", "model": "eleven_v4",
             "voice_settings": {...}, "fallback": {...}}}

episode.json keys that use it (all optional, explicit episode keys always win):
  "characters": ["somchun"]  -> image_block appended to the shared style, refs attached to Codex
  "narrator": "somchun"      -> voice keys filled in for tts.py when the episode doesn't set them
  "style_anchor": true | "<path from repo root>"  -> attach content/<series>/style-anchor.png (or the path)
"""
import json
from pathlib import Path

from media import ROOT

CHAR_DIR = ROOT / "shared" / "characters"
VOICE_KEYS = ("tts", "voice", "model", "rate", "voice_settings", "fallback")


def load(name: str) -> dict:
    path = CHAR_DIR / name / "character.json"
    if not path.exists():
        raise FileNotFoundError(f"character not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def apply_voice(episode: dict) -> dict:
    """Fill missing voice keys from the narrator's character.json (in place)."""
    name = episode.get("narrator")
    if name:
        for k, v in load(name).get("voice", {}).items():
            if k in VOICE_KEYS:
                episode.setdefault(k, v)
    return episode


def image_context(episode: dict, episode_dir: Path) -> tuple[str, list[tuple[str, str]]]:
    """Return (extra style text, [(ref path, role)]) for the characters + style anchor."""
    blocks, refs = [], []
    for name in episode.get("characters", []):
        ch = load(name)
        if ch.get("image_block"):
            blocks.append(ch["image_block"])
        for r in ch.get("refs", []):
            refs.append((str(CHAR_DIR / name / r), f"reference sheet of {ch.get('name', name)}"))
    anchor = episode.get("style_anchor")
    if anchor:
        path = ROOT / anchor if isinstance(anchor, str) else episode_dir.parent.parent / "style-anchor.png"
        refs.append((str(path), "style anchor: match its palette, lighting and rendering style only, not its content"))
    return " ".join(blocks), refs

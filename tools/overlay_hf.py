"""HyperFrames graphics layer for render_reel.py (opt-in: "overlay": "hyperframes" in episode.json).

Builds <episode>/.build/hf/ from tools/hyperframes/overlay.html + data.js + the episode font,
renders it with the HyperFrames CLI (Node 22+, npx) to a transparent ProRes 4444 .mov, and
returns its path. render_reel.py overlays it on the backgrounds instead of burning ASS subs.

Layers: word-by-word captions (same timing as tools/subtitles.py), vignette, dust motes,
end card ("ตอนตีสอง"), and optional TikTok hook text on frame 1.

Episode keys (all optional):
  "overlay": "hyperframes"
  "overlay_opts": {"dust": true, "vignette": true, "endcard": true}
  "hook_text": "..."   text for the -tiktok render (default: first card of the first segment)
"""
import json
import shutil
import subprocess
from pathlib import Path

from media import ROOT
from subtitles import CARD_HOLD_SEC, aligned_starts, fill_missing, spoken, tokenize_card

HF_VERSION = "0.9.93"  # pinned: same input -> same frames
TEMPLATE = ROOT / "tools" / "hyperframes" / "overlay.html"
HOOK_SEC = 2.5
RENDER_TIMEOUT_SEC = 1800


def caption_segments(kept: list[dict], audio_dir: Path) -> list[dict]:
    """Cards with per-word start times, on the rendered (post-skip) timeline."""
    out = []
    for seg in kept:
        cards = seg.get("cards") or [seg["text"]]
        card_tokens = [tokenize_card(c) for c in cards]
        flat = [t for toks in card_tokens for t in toks]
        align = audio_dir / seg["align"] if seg.get("align") else None
        raw = (aligned_starts(flat, json.loads(align.read_text(encoding="utf-8")), seg["start"])
               if align and align.exists() else [None] * len(flat))
        starts = fill_missing(raw, flat, seg["start"], seg["end"])
        out_cards, pos = [], 0
        for toks in card_tokens:
            words = [{"text": tok, "t": round(starts[pos + k], 3)}
                     for k, tok in enumerate(toks) if tok != "\n" and spoken(tok)]
            out_cards.append({"start": words[0]["t"] if words else seg["start"], "words": words})
            pos += len(toks)
        for i, c in enumerate(out_cards):
            c["end"] = out_cards[i + 1]["start"] if i + 1 < len(out_cards) else round(seg["end"] + CARD_HOLD_SEC, 3)
        out.append({"id": seg.get("id"), "style": seg.get("style", "Body"),
                    "start": seg["start"], "end": seg["end"], "cards": out_cards})
    return out


def hook_text(episode: dict) -> str:
    if episode.get("hook_text"):
        return episode["hook_text"]
    first = episode["segments"][0]
    return (first.get("cards") or [first["text"]])[0]


def npx() -> str:
    exe = shutil.which("npx") or shutil.which("npx.cmd")
    if not exe:
        raise RuntimeError("npx not found: HyperFrames overlay needs Node.js 22+")
    return exe


def render_overlay(episode: dict, kept: list[dict], total: float, work: Path, font_file: Path,
                   position: str, audio_dir: Path, tiktok: bool = False) -> Path:
    opts = {"dust": True, "vignette": True, "endcard": True, **episode.get("overlay_opts", {})}
    proj = work / ("hf-tiktok" if tiktok else "hf")
    shutil.rmtree(proj, ignore_errors=True)
    proj.mkdir(parents=True)

    html = TEMPLATE.read_text(encoding="utf-8").replace('data-duration="10"', f'data-duration="{total:.3f}"')
    (proj / "index.html").write_text(html, encoding="utf-8")
    shutil.copy(font_file, proj / "font.ttf")
    data = {"total": round(total, 3), "position": position, "segments": caption_segments(kept, audio_dir),
            "hook": {"text": hook_text(episode), "duration": HOOK_SEC} if tiktok else None, **opts}
    (proj / "data.js").write_text("window.OVERLAY = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")

    out = work / ("overlay-tiktok.mov" if tiktok else "overlay.mov")
    cmd = [npx(), "--yes", f"hyperframes@{HF_VERSION}", "render", str(proj), "--format", "mov",
           "--fps", "30", "-o", str(out), "--quiet"]
    print(f"HyperFrames overlay: rendering {total:.1f}s{' (tiktok hook)' if tiktok else ''}...")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       stdin=subprocess.DEVNULL, timeout=RENDER_TIMEOUT_SEC)
    if r.returncode != 0 or not out.exists():
        raise RuntimeError(f"HyperFrames render failed:\n{(r.stderr or r.stdout)[-2000:]}")
    return out

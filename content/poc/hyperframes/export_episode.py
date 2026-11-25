"""Export an image-mode episode into a HyperFrames project (POC).

Copies the cached parallax clips (.build/bgNN.mp4), voice.mp3 and font into
<project>/assets/ and writes <project>/captions.js with per-word timings taken
from the same alignment logic as tools/subtitles.py.

Usage: .venv/Scripts/python.exe content/poc/hyperframes/export_episode.py <episode> <project>
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
import media  # noqa: E402,F401  (puts ffmpeg on PATH)
from subtitles import CARD_HOLD_SEC, aligned_starts, fill_missing, spoken, tokenize_card  # noqa: E402


def duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main(episode: Path, project: Path) -> None:
    ep = json.loads((episode / "episode.json").read_text(encoding="utf-8"))
    timeline = json.loads((episode / "audio" / "timeline.json").read_text(encoding="utf-8"))
    assets = project / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    shutil.copy2(episode / "audio" / "voice.mp3", assets / "voice.mp3")
    font = ROOT / ep.get("font", "shared/fonts/IBMPlexSansThai-SemiBold.ttf")
    shutil.copy2(font, assets / "font.ttf")

    clips, t = [], 0.0
    for i, _ in enumerate(timeline["segments"]):
        src = episode / ".build" / f"bg{i:02d}.mp4"
        shutil.copy2(src, assets / src.name)
        d = duration(src)
        clips.append({"src": f"assets/{src.name}", "start": round(t, 3), "duration": round(d, 3)})
        t += d

    segments = []
    for seg in timeline["segments"]:
        cards = seg.get("cards") or [seg["text"]]
        card_tokens = [tokenize_card(c) for c in cards]
        flat = [tok for toks in card_tokens for tok in toks]
        align = episode / "audio" / seg["align"] if seg.get("align") else None
        raw = (aligned_starts(flat, json.loads(align.read_text(encoding="utf-8")), seg["start"])
               if align and align.exists() else [None] * len(flat))
        starts = fill_missing(raw, flat, seg["start"], seg["end"])

        out_cards, pos = [], 0
        for toks in card_tokens:
            words = [{"text": tok, "t": round(starts[pos + k], 3)}
                     for k, tok in enumerate(toks) if tok != "\n" and spoken(tok)]
            out_cards.append({"start": words[0]["t"] if words else seg["start"], "words": words})
            pos += len(toks)
        for ci, c in enumerate(out_cards):
            c["end"] = out_cards[ci + 1]["start"] if ci + 1 < len(out_cards) else round(seg["end"] + CARD_HOLD_SEC, 3)
        segments.append({"id": seg["id"], "style": seg.get("style", "Body"),
                         "start": seg["start"], "end": seg["end"], "cards": out_cards})

    data = {"total": timeline["total"], "clips": clips, "segments": segments}
    (project / "captions.js").write_text(
        "window.EPISODE = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"exported {len(clips)} clips, {sum(len(s['cards']) for s in segments)} cards, total {timeline['total']}s")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())

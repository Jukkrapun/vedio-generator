"""ASS subtitles: word-by-word reveal with the spoken word highlighted.

Timing source per segment:
  - "align" file (ElevenLabs forced alignment, per-character times) -> exact word starts
  - otherwise -> estimated: segment time split across cards/words by character count
Unspoken words are drawn fully transparent so line layout never shifts while words appear.
"""
import json
from pathlib import Path

from pythainlp.tokenize import word_tokenize

from media import HEIGHT, WIDTH

HIGHLIGHT = "&H0066D9FF&"  # warm gold (ASS colours are &HBBGGRR)
HIDDEN = "{\\alpha&HFF&}"
SKIP_CHARS = set(" \n.…,!?\"'")
SEARCH_WINDOW = 12  # how far ahead to look when card text differs slightly from spoken text
CARD_HOLD_SEC = 0.25
# (alignment, marginV): center for image reels; lower third (above platform UI) for host
POSITIONS = {"center": (5, 0), "lower": (2, 470)}
STYLE_FORMAT = ("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
                "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
                "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding")


def ass_header(position: str, font_name: str) -> str:
    align, margin_v = POSITIONS[position]
    # Text only (no box): black outline + soft shadow keeps it readable on light clothes.
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 2

[V4+ Styles]
{STYLE_FORMAT}
Style: Body,{font_name},68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,2,{align},90,90,{margin_v},222
Style: Hook,{font_name},84,&H00D9F2FF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,5,3,{align},90,90,{margin_v},222

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ass_time(sec: float) -> str:
    cs = int(round(sec * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def tokenize_card(card: str) -> list[str]:
    """Words of a card; "\n" kept as its own token, spaces glued to the previous word."""
    tokens: list[str] = []
    for li, line in enumerate(card.split("\n")):
        if li:
            tokens.append("\n")
        for w in word_tokenize(line, keep_whitespace=True):
            if w.isspace() and tokens and tokens[-1] != "\n":
                tokens[-1] += w
            else:
                tokens.append(w)
    return tokens


def spoken(word: str) -> str:
    return "".join(c for c in word if c not in SKIP_CHARS)


def aligned_starts(words: list[str], chars: list[list], offset: float) -> list[float | None]:
    """Start time per word by matching it in the aligned character stream (None if not found)."""
    stream = [(c, t) for c, t in chars if c not in SKIP_CHARS]
    text = "".join(c for c, _ in stream)
    starts, ptr = [], 0
    for w in words:
        s = spoken(w)
        if not s:
            starts.append(None)
            continue
        idx = text.find(s, ptr, ptr + len(s) + SEARCH_WINDOW)
        if idx < 0:
            starts.append(None)
            ptr += len(s)
        else:
            starts.append(offset + stream[idx][1])
            ptr = idx + len(s)
    return starts


def fill_missing(starts: list[float | None], words: list[str], begin: float, end: float) -> list[float]:
    """Interpolate missing word starts by character weight between known neighbours."""
    known = [(i, t) for i, t in enumerate(starts) if t is not None]
    anchors = [(-1, begin)] + known + [(len(words), end)]
    out = list(starts)
    for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):
        if i0 >= 0:  # the known word itself occupies the first slot of the gap
            i0, weights_from = i0, [len(spoken(words[i0]))]
        else:
            weights_from = []
        gap = list(range(i0 + 1, i1))
        weights = weights_from + [len(spoken(words[k])) for k in gap]
        total, acc = sum(weights) or 1, weights[0] if weights_from else 0
        for k in gap:
            out[k] = t0 + (t1 - t0) * acc / total
            acc += len(spoken(words[k]))
    return [t if t is not None else begin for t in out]


def card_events(tokens: list[str], starts: list[float], end: float, style: str) -> list[str]:
    """One event per spoken word: past words shown, current highlighted, future hidden."""
    word_idx = [i for i, t in enumerate(tokens) if t != "\n" and spoken(t)]
    events = []
    for n, i in enumerate(word_idx):
        t0 = starts[i]
        t1 = starts[word_idx[n + 1]] if n + 1 < len(word_idx) else end
        parts = []
        for j, tok in enumerate(tokens):
            if tok == "\n":
                parts.append("\\N")
            elif j < i or not spoken(tok):
                parts.append(tok if j < i else HIDDEN + tok + "{\\alpha&H00&}")
            elif j == i:
                parts.append(f"{{\\c{HIGHLIGHT}}}{tok}{{\\r}}")
            else:
                parts.append(HIDDEN + tok + "{\\r}")
        if t1 > t0:
            events.append(f"Dialogue: 0,{ass_time(t0)},{ass_time(t1)},{style},,0,0,0,,{''.join(parts)}")
    return events


def segment_events(seg: dict, audio_dir: Path) -> list[str]:
    cards = seg.get("cards") or [seg["text"]]
    card_tokens = [tokenize_card(c) for c in cards]
    flat = [t for toks in card_tokens for t in toks]
    align_path = audio_dir / seg["align"] if seg.get("align") else None
    raw = (aligned_starts(flat, json.loads(align_path.read_text(encoding="utf-8")), seg["start"])
           if align_path and align_path.exists() else [None] * len(flat))
    starts = fill_missing(raw, flat, seg["start"], seg["end"])

    events, pos, style = [], 0, seg.get("style", "Body")
    card_starts = []
    for toks in card_tokens:
        card_starts.append(starts[pos])
        pos += len(toks)
    pos = 0
    for ci, toks in enumerate(card_tokens):
        end = card_starts[ci + 1] if ci + 1 < len(card_tokens) else seg["end"] + CARD_HOLD_SEC
        events += card_events(toks, starts[pos:pos + len(toks)], end, style)
        pos += len(toks)
    return events


def build_subtitles(timeline: list[dict], position: str, font_name: str, audio_dir: Path) -> str:
    lines = [ass_header(position, font_name)]
    for seg in timeline:
        lines += segment_events(seg, audio_dir)
    return "\n".join(lines) + "\n"

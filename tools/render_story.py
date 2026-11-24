"""Render a long-form 16:9 story video (mode "story"), one file per language.

Usage:
    python tools/render_story.py content/<series>/episodes/<episode> [--lang th|en]

episode.json (see docs/long-form/PLAN.md):
    "mode": "story",
    "languages": {"th": {"tts": "edge", "voice": "...", "rate": "-10%"}, "en": {...}},
    "segments": [{"id", "image", "image_prompt", "chapter": {"th", "en"}, "text": {"th", "en"}}]

Per language: voice cached in audio/<lang>/ (same cache as the shorts, tools/tts.py)
-> one span per image (consecutive segments sharing an image merge) with a very slow Ken Burns
and a fade through black -> bottom subtitles one line at a time -> optional music bed
-> output/<series>/<episode>-story-<lang>.mp4 (+ .chapters.txt for the YouTube description).
Nothing here touches the shorts' renderer (render_reel.py) or its 90 s limit.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv

from media import ROOT, run, series_path
from render_reel import font_family
from subtitles import ass_time
from tts import mix_voice_track, strip_audio_tags, synthesize_segments

WIDTH, HEIGHT, FPS = 1920, 1080, 30
TAIL_SEC = 2.5
FADE_SEC = 0.7
ZOOM_RANGE = 0.08  # each image drifts 8% over its whole span
MUSIC_VOLUME = 0.10
LONG_TIMEOUT = 3600
DEFAULT_FONT = "shared/fonts/IBMPlexSansThai-SemiBold.ttf"
LINE_CHARS = {"th": 38, "en": 56}  # max characters per subtitle line
SHARED_TTS_KEYS = ("tts", "voice", "model", "rate", "fallback", "language")


def lang_episode(episode: dict, lang: str) -> dict:
    """Flatten the episode for one language so tools/tts.py can synthesize it unchanged."""
    cfg = episode["languages"][lang]
    base = {k: v for k, v in episode.items() if k not in ("languages", "segments")}
    segs = [{**s, "text": s["text"][lang]} for s in episode["segments"] if not s.get("skip")]
    out = {**base, **{k: cfg[k] for k in SHARED_TTS_KEYS if k in cfg}, "segments": segs}
    out.setdefault("language", lang)
    return out


def build_story_voice(episode_dir: Path, ep: dict, lang: str) -> tuple[list[dict], float]:
    audio_dir = episode_dir / "audio" / lang
    audio_dir.mkdir(parents=True, exist_ok=True)
    timeline = synthesize_segments(ep, audio_dir)
    total = round(timeline[-1]["end"] + TAIL_SEC, 3)
    mix_voice_track(timeline, audio_dir, total)
    (audio_dir / "timeline.json").write_text(
        json.dumps({"total": total, "segments": timeline}, ensure_ascii=False, indent=2), encoding="utf-8")
    return timeline, total


def windows(timeline: list[dict], total: float) -> list[tuple[float, float]]:
    """Each segment owns [start, end) on the screen, split at the middle of the pauses."""
    out = []
    for i, seg in enumerate(timeline):
        a = 0.0 if i == 0 else (timeline[i - 1]["end"] + seg["start"]) / 2
        b = total if i == len(timeline) - 1 else (seg["end"] + timeline[i + 1]["start"]) / 2
        out.append((a, b))
    return out


def image_spans(timeline: list[dict], total: float) -> list[tuple[str, float, float]]:
    """[(image, start, duration)] merging consecutive segments with the same image."""
    spans: list[list] = []
    for seg, (a, b) in zip(timeline, windows(timeline, total)):
        if spans and spans[-1][0] == seg["image"]:
            spans[-1][2] = b
        else:
            spans.append([seg["image"], a, b])
    return [(img, a, b - a) for img, a, b in spans]


def render_still(image: Path, duration: float, out: Path, zoom_in: bool) -> None:
    frames = int(duration * FPS) + 1
    step = ZOOM_RANGE / max(frames, 1)
    zoom = f"1+{step:.8f}*on" if zoom_in else f"{1 + ZOOM_RANGE}-{step:.8f}*on"
    # zoompan rounds its crop to whole source pixels -> visible shake on slow zooms. A 4x source
    # makes each step 1/4 output pixel, which looks smooth (1.5x shook: user feedback 2026-11-23).
    w2, h2 = WIDTH * 4, HEIGHT * 4
    vf = (f"scale={w2}:{h2}:force_original_aspect_ratio=increase,crop={w2}:{h2},"
          f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS},"
          f"eq=brightness=-0.06:saturation=0.9,"
          f"fade=t=in:st=0:d={FADE_SEC},fade=t=out:st={max(duration - FADE_SEC, 0):.2f}:d={FADE_SEC}")
    run(["ffmpeg", "-y", "-loop", "1", "-i", str(image), "-t", f"{duration:.3f}", "-vf", vf,
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)],
        timeout=LONG_TIMEOUT)


def render_image(image: Path, duration: float, out: Path, i: int, motion: str, opts: dict | None = None) -> None:
    """Background shot: "parallax" (default, 2.5D depth move, tools/parallax.py) or "zoom" (flat).
    Falls back to zoom when opencv/depth are unavailable. `opts` = episode "parallax" block."""
    if motion == "parallax":
        try:
            import parallax
            grade = (f"eq=brightness=-0.06:saturation=0.9,fade=t=in:st=0:d={FADE_SEC},"
                     f"fade=t=out:st={max(duration - FADE_SEC, 0):.2f}:d={FADE_SEC}")
            parallax.render_parallax(image, duration, out, WIDTH, HEIGHT, FPS, variant=i, post_vf=grade,
                                     **(opts or {}))
            return
        except Exception as e:  # noqa: BLE001
            print(f"WARNING: parallax failed for {image.name} ({e}) -> zoom", file=sys.stderr)
    render_still(image, duration, out, zoom_in=i % 2 == 0)


def wrap_words(text: str, limit: int) -> list[str]:
    words = text.split()
    n = max(2, -(-len(text) // limit))  # balanced: split into n roughly equal lines
    size = -(-len(words) // n)
    return [" ".join(words[i:i + size]) for i in range(0, len(words), size)]


def split_lines(text: str, lang: str) -> list[str]:
    """Short subtitle lines: explicit newlines first, then phrases (Thai spaces / English punctuation)."""
    limit = LINE_CHARS.get(lang, 50)
    lines = []
    for para in strip_audio_tags(text).replace("...", "… ").split("\n"):
        if lang == "en":
            parts = re.split(r"(?<=[.!?,;:—…])\s+", para.strip())
        else:
            parts = []
            for tok in para.split():  # keep Thai repeat mark "ๆ" with its word
                if tok.startswith("ๆ") and parts:
                    parts[-1] += f" {tok}"
                else:
                    parts.append(tok)
        # a phrase still too long -> wrap on spaces
        parts = [w for p in parts for w in (wrap_words(p, limit) if len(p) > limit else [p])]
        current = ""
        for part in filter(None, (p.strip() for p in parts)):
            joined = f"{current} {part}".strip()
            if current and len(joined) > limit:
                lines.append(current)
                current = part
            else:
                current = joined
        if current:
            lines.append(current)
    return lines


def build_subs(timeline: list[dict], lang: str, font_name: str) -> str:
    size = 54 if lang == "th" else 50
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Body,{font_name},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,100,100,0,0,1,3,2,2,160,160,70,222

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for seg in timeline:
        lines = split_lines(seg["text"], lang)
        weights = [max(len(l.replace(" ", "")), 1) for l in lines]
        t, span = seg["start"], seg["end"] - seg["start"]
        for line, w in zip(lines, weights):
            d = span * w / sum(weights)
            text = line.replace("{", "(").replace("}", ")")
            events.append(f"Dialogue: 0,{ass_time(t)},{ass_time(t + d + 0.15)},Body,,0,0,0,,{{\\fad(150,150)}}{text}")
            t += d
    return head + "\n".join(events) + "\n"


def chapters(episode: dict, timeline: list[dict], total: float, lang: str) -> str:
    rows = []
    segs = [s for s in episode["segments"] if not s.get("skip")]
    for seg, (a, _) in zip(segs, windows(timeline, total)):
        title = seg.get("chapter")
        if title:
            title = title.get(lang) if isinstance(title, dict) else title
            sec = 0 if not rows else int(a)  # YouTube needs the first chapter at 0:00
            rows.append(f"{sec // 60}:{sec % 60:02d} {title}")
    return "\n".join(rows) + ("\n" if rows else "")


def render_lang(episode_dir: Path, episode: dict, lang: str) -> Path:
    ep = lang_episode(episode, lang)
    for seg in ep["segments"]:
        if not (episode_dir / seg["image"]).exists():
            raise FileNotFoundError(f"Missing image: {episode_dir / seg['image']} (run tools/images.py)")
    timeline, total = build_story_voice(episode_dir, ep, lang)
    print(f"[{lang}] voice {total:.1f}s ({total / 60:.1f} min)")

    work = episode_dir / ".build" / f"story-{lang}"
    shutil.rmtree(work, ignore_errors=True)
    (work / "fonts").mkdir(parents=True)
    font_cfg = episode["languages"][lang].get("font") or episode.get("font", DEFAULT_FONT)
    font_file = ROOT / font_cfg
    shutil.copy(font_file, work / "fonts")
    (work / "subs.ass").write_text(build_subs(timeline, lang, font_family(font_file)), encoding="utf-8")

    clips = []
    for i, (img, _, dur) in enumerate(image_spans(timeline, total)):
        clip = work / f"bg{i:02d}.mp4"
        render_image(episode_dir / img, dur, clip, i, episode.get("motion", "parallax"), episode.get("parallax"))
        clips.append(clip)
    (work / "clips.txt").write_text("".join(f"file '{c.name}'\n" for c in clips), encoding="utf-8")

    voice = episode_dir / "audio" / lang / "voice.mp3"
    inputs, amap = ["-i", str(voice)], ["-map", "1:a"]
    filters = ["ass=subs.ass:fontsdir=fonts"]
    if episode.get("music"):
        inputs += ["-stream_loop", "-1", "-i", str(ROOT / episode["music"])]
        afilter = (f"[2:a]volume={MUSIC_VOLUME},afade=t=out:st={total - 3:.2f}:d=3[bg];"
                   f"[1:a][bg]amix=inputs=2:duration=first:normalize=0[a]")
        amap = ["-filter_complex", afilter, "-map", "[a]"]

    out = ROOT / "output" / series_path(episode_dir) / f"{episode_dir.name}-story-{lang}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "clips.txt", *inputs,
         "-vf", ",".join(filters), "-map", "0:v", *amap,
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(out)],
        cwd=work, timeout=LONG_TIMEOUT)
    chap = chapters(episode, timeline, total, lang)
    if chap:
        out.with_suffix(".chapters.txt").write_text(chap, encoding="utf-8")
    print(f"Rendered {out} ({total:.1f}s)")
    return out


def render_story(episode_dir: Path, langs: list[str] | None = None) -> list[Path]:
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    if episode.get("mode") != "story":
        raise ValueError('render_story.py needs "mode": "story" (use render_reel.py for shorts)')
    return [render_lang(episode_dir, episode, lang) for lang in (langs or list(episode["languages"]))]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    langs = [args[args.index("--lang") + 1]] if "--lang" in args else None
    render_story(Path(args[0]).resolve(), langs)

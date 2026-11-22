"""Render a vertical reel (1080x1920) from an episode folder.

Usage:
    python tools/render_reel.py content/<series>/episodes/<episode>

Steps: voice track (tools/tts.py, cached) -> backgrounds per span -> ASS subtitles
-> mux voice (+ optional music) -> burn subs -> output/<series>/<episode>-<mode>.mp4

Visuals per segment ("visual" in episode.json):
  "host"  - podcast host talking. Uses <episode>/video/host.mp4 (lip-sync video made from
            audio/voice.mp3). If missing, renders a PREVIEW from the still host["scene"] image.
  "image" - still image (segment "image") with slow Ken Burns zoom.
Default is "host" when the episode has a "host" block, otherwise "image".
"""
import json
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
from fontTools.ttLib import TTFont

from media import FPS, HEIGHT, ROOT, WIDTH, host_look, output_path, run
from subtitles import build_subtitles
from tts import build_voice

MUSIC_VOLUME = 0.12
DEFAULT_FONT = "shared/fonts/IBMPlexSansThai-SemiBold.ttf"  # override per episode: "font": "shared/fonts/<file>.ttf"
HOST_VIDEO = Path("video/host.mp4")
# Punch-in: host segments alternate wide / zoomed, like a multi-camera podcast edit.
PUNCH_ZOOM = 1.18
FACE_Y = 0.30  # face height as a fraction of the frame; zoom keeps it at the same screen spot
COVER = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}"


def font_family(font_file: Path) -> str:
    """Full font name from the file's name table (what libass matches), e.g. 'Kanit SemiBold'."""
    return TTFont(font_file)["name"].getDebugName(4)


def is_video_mode(episode: dict) -> bool:
    return episode.get("mode", "image") == "video"


def default_visual(episode: dict) -> str:
    """Video mode shows the talking host by default; image mode shows each segment's image."""
    return "host" if is_video_mode(episode) and episode.get("host") else "image"


def visual_key(seg: dict, default: str) -> str:
    return "host" if seg.get("visual", default) == "host" else seg["image"]


def plan_cuts(timeline: list[dict], total: float) -> tuple[list[dict], float]:
    """Drop segments marked "skip": true without touching voice.mp3 / host.mp4.

    Each segment owns a source window [src_start, src_end) in voice.mp3 time, split at the
    middle of the pauses. Kept windows are laid end to end in output time; the same windows
    are cut from both the voice track and the lip-sync video, so lips stay in sync.
    Returns (kept segments retimed to output time, each with src_start/src_end), output total.
    """
    kept, cursor = [], 0.0
    for i, seg in enumerate(timeline):
        src_start = 0.0 if i == 0 else (timeline[i - 1]["end"] + seg["start"]) / 2
        src_end = total if i == len(timeline) - 1 else (seg["end"] + timeline[i + 1]["start"]) / 2
        if seg.get("skip"):
            continue
        shift = cursor - src_start
        kept.append({**seg, "start": seg["start"] + shift, "end": seg["end"] + shift,
                     "src_start": src_start, "src_end": src_end})
        cursor += src_end - src_start
    if not kept:
        raise ValueError("All segments are skipped")
    return kept, round(cursor, 3)


def group_spans(kept: list[dict], default: str | None, punch_in: bool = False) -> list[tuple[str, float, float]]:
    """Merge consecutive kept segments with the same visual and contiguous source
    -> [(key, src_start, duration)]. default=None groups by time only (for audio)."""
    spans: list[list] = []
    for n, seg in enumerate(kept):
        key = visual_key(seg, default) if default else "audio"
        if key == "host" and punch_in:
            key = f"host@{PUNCH_ZOOM if n % 2 else 1.0}"  # alternating keys never merge
        if spans and spans[-1][0] == key and abs(spans[-1][3] - seg["src_start"]) < 1e-6:
            spans[-1][3] = seg["src_end"]
        else:
            spans.append([key, seg["src_start"], 0.0, seg["src_end"]])
    return [(k, s, e - s) for k, s, _, e in spans]


def render_still(image: Path, duration: float, out: Path, zoom_in: bool) -> None:
    frames = int(duration * FPS) + 1
    zoom = "min(1+0.0006*on,1.12)" if zoom_in else "max(1.12-0.0006*on,1)"
    vf = (
        f"scale={WIDTH * 2}:{HEIGHT * 2}:force_original_aspect_ratio=increase,crop={WIDTH * 2}:{HEIGHT * 2},"
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS},"
        f"eq=brightness=-0.08:saturation=0.9,fade=t=in:st=0:d=0.4,fade=t=out:st={max(duration - 0.4, 0):.2f}:d=0.4"
    )
    run(["ffmpeg", "-y", "-loop", "1", "-i", str(image), "-t", f"{duration:.3f}", "-vf", vf,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)])


def render_host_cut(video: Path, start: float, duration: float, out: Path, zoom: float = 1.0) -> None:
    """Cut [start, start+duration] from the lip-sync video; hold last frame if it is too short.
    zoom > 1 crops in around the face (punch-in) and scales back to full frame."""
    punch = ""
    if zoom > 1:
        punch = (f",crop=iw/{zoom}:ih/{zoom}:(iw-iw/{zoom})/2:ih*{FACE_Y}-(ih/{zoom})*{FACE_Y},"
                 f"scale={WIDTH}:{HEIGHT}:flags=lanczos")
    vf = f"{COVER}{punch},fps={FPS},tpad=stop_mode=clone:stop_duration={duration:.3f}"
    run(["ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", str(video), "-t", f"{duration:.3f}", "-vf", vf,
         "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(out)])


def render_backgrounds(episode: dict, episode_dir: Path, kept: list[dict], work: Path,
                       host_video: Path | None = None) -> list[Path]:
    default = default_visual(episode)
    host_video = host_video or episode_dir / HOST_VIDEO
    use_video = is_video_mode(episode) and host_video.exists()
    if is_video_mode(episode) and not host_video.exists():
        print(f"WARNING: {host_video} not found -> PREVIEW with still host scene (no lip-sync)", file=sys.stderr)
    punch_in = episode.get("punch_in", True) and use_video
    clips = []
    for i, (key, start, dur) in enumerate(group_spans(kept, default, punch_in)):
        clip = work / f"bg{i:02d}.mp4"
        if not key.startswith("host"):
            render_still(episode_dir / key, dur, clip, zoom_in=i % 2 == 0)
        elif use_video:
            zoom = float(key.split("@")[1]) if "@" in key else 1.0
            render_host_cut(host_video, start, dur, clip, zoom)
        else:
            render_still(host_look(episode["host"])["scene"], dur, clip, zoom_in=True)
        clips.append(clip)
    return clips


def mux_audio(voice: Path, kept: list[dict], total: float, music: Path | None, out: Path) -> None:
    """Cut the kept source windows from voice.mp3 (same windows as the video) and join them."""
    spans = group_spans(kept, None)  # audio ignores visuals; merge contiguous windows only
    filters = [f"[0:a]atrim={s:.3f}:{s + d:.3f},asetpts=PTS-STARTPTS[c{i}]" for i, (_, s, d) in enumerate(spans)]
    filters.append("".join(f"[c{i}]" for i in range(len(spans))) + f"concat=n={len(spans)}:v=0:a=1[voice]")
    inputs, final = ["-i", str(voice)], "[voice]"
    if music:
        inputs += ["-stream_loop", "-1", "-i", str(music)]
        filters.append(f"[1:a]volume={MUSIC_VOLUME},afade=t=out:st={total - 2:.2f}:d=2[bg]")
        filters.append("[voice][bg]amix=inputs=2:duration=first:normalize=0[mixed]")
        final = "[mixed]"
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", final,
         "-t", f"{total:.3f}", "-c:a", "aac", "-b:a", "192k", str(out)])


def check_inputs(episode: dict, episode_dir: Path) -> None:
    default = default_visual(episode)
    keys = [visual_key(seg, default) for seg in episode["segments"]]
    for seg, key in zip(episode["segments"], keys):
        if key != "host" and not (episode_dir / key).exists():
            raise FileNotFoundError(f"Missing image: {episode_dir / key} (run tools/images.py or produce.py)")
    if "host" in keys and not host_look(episode["host"])["scene"].exists():
        raise FileNotFoundError(f"Missing host scene: {host_look(episode['host'])['scene']}")


def render(episode_dir: Path, host_video: Path | None = None, out: Path | None = None) -> Path:
    """host_video/out override video/host.mp4 and the output path (used for engine comparisons)."""
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    check_inputs(episode, episode_dir)
    timeline, voice_total = build_voice(episode_dir)
    kept, total = plan_cuts(timeline, voice_total)

    work = episode_dir / ".build"
    shutil.rmtree(work, ignore_errors=True)
    (work / "fonts").mkdir(parents=True)
    font_file = ROOT / episode.get("font", DEFAULT_FONT)
    shutil.copy(font_file, work / "fonts")
    position = episode.get("subtitles", "lower" if default_visual(episode) == "host" else "center")
    subs = build_subtitles(kept, position, font_family(font_file), episode_dir / "audio")
    (work / "subs.ass").write_text(subs, encoding="utf-8")

    clips = render_backgrounds(episode, episode_dir, kept, work, host_video)
    (work / "clips.txt").write_text("".join(f"file '{c.name}'\n" for c in clips), encoding="utf-8")
    music = ROOT / episode["music"] if episode.get("music") else None
    mux_audio(episode_dir / "audio" / "voice.mp3", kept, total, music, work / "audio.m4a")

    out = out or output_path(episode_dir, episode.get("mode", "image"))
    out.parent.mkdir(parents=True, exist_ok=True)
    # Run in the build dir so the subtitle filter gets plain relative paths (avoids Windows escaping issues)
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "clips.txt", "-i", "audio.m4a",
         "-vf", "ass=subs.ass:fontsdir=fonts", "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(out)], cwd=work)
    print(f"Rendered {out} ({total:.1f}s)")
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    render(Path(sys.argv[1]).resolve())

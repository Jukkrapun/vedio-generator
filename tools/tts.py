"""Build an episode's voice track, cached in <episode>/audio/.

Usage:
    python tools/tts.py content/<series>/episodes/<episode>

Writes:
    audio/NN-<segment>.mp3   one clip per segment (re-synthesized only when its text/voice changes)
    audio/voice.mp3          full voice track incl. pauses — upload this for lip-sync
    audio/timeline.json      segment start/end times used by the renderer
"""
import asyncio
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import edge_tts
from dotenv import load_dotenv

from media import MAX_DURATION_SEC, ROOT, probe_duration, run

LEAD_IN_SEC = 0.3
TAIL_SEC = 1.2
TTS_RETRIES = 10  # edge-tts Thai fails ~50-70% of calls at times; failures are random, not text-specific
ELEVENLABS_MODEL = "eleven_v3"
TTS_KEYS = ("tts", "voice", "model", "rate")


class PaidPlanRequired(RuntimeError):
    """ElevenLabs refused the voice for this plan (HTTP 402)."""


def strip_audio_tags(text: str) -> str:
    """Remove ElevenLabs v3 tags like [softly] so other engines don't read them aloud."""
    return re.sub(r"\[[^\]]*\]\s*", "", text).strip()


def synthesize(cfg: dict, text: str, out_path: Path) -> bool:
    """Synthesize text with cfg's engine. Returns False if the fallback engine was used."""
    if cfg.get("tts", "edge") != "elevenlabs":
        synthesize_edge(strip_audio_tags(text), cfg["voice"], cfg.get("rate", "+0%"), out_path)
        return True
    try:
        synthesize_elevenlabs(text, cfg["voice"], cfg.get("model", ELEVENLABS_MODEL), out_path,
                              cfg.get("language", "th"))
        return True
    except PaidPlanRequired as e:
        fallback = cfg.get("fallback")
        if not fallback:
            raise
        print(f"WARNING: {e} -> falling back to {fallback['tts']} {fallback['voice']}", file=sys.stderr)
        synthesize(fallback, text, out_path)
        return False


def synthesize_elevenlabs(text: str, voice_id: str, model: str, out_path: Path, language: str = "th") -> None:
    """Thai needs eleven_v3. Library voices need a paid plan (402 otherwise)."""
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY not set (put it in .env at repo root)")
    body = json.dumps({"text": text, "model_id": model, "language_code": language}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            audio = resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        if e.code == 402:
            raise PaidPlanRequired(f"ElevenLabs voice {voice_id} needs a paid plan") from e
        raise RuntimeError(f"ElevenLabs {e.code}: {detail}") from e
    out_path.write_bytes(audio)


def synthesize_edge(text: str, voice: str, rate: str, out_path: Path) -> None:
    """edge-tts intermittently returns no audio for Thai; retry with backoff."""
    for attempt in range(1, TTS_RETRIES + 1):
        try:
            asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(str(out_path)))
            return
        except edge_tts.exceptions.NoAudioReceived:
            if attempt == TTS_RETRIES:
                raise
            time.sleep(min(attempt * 2, 10))


def cache_key(episode: dict, text: str) -> str:
    cfg = {k: episode.get(k) for k in TTS_KEYS}
    return hashlib.sha1(json.dumps([cfg, text], ensure_ascii=False).encode()).hexdigest()


def synthesize_segments(episode: dict, audio_dir: Path) -> list[dict]:
    """Synthesize (or reuse cached) clips; return segments with start/end times."""
    manifest_path = audio_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    new_manifest, timeline, cursor = {}, [], LEAD_IN_SEC
    for i, seg in enumerate(episode["segments"]):
        mp3 = audio_dir / f"{i:02d}-{seg['id']}.mp3"
        key = cache_key(episode, seg["text"])
        # Always cache — even fallback audio — because a lip-sync video made from voice.mp3
        # breaks if the audio changes. To regenerate (e.g. after upgrading ElevenLabs), delete audio/.
        if not (manifest.get(mp3.name) == key and mp3.exists()):
            if not synthesize(episode, seg["text"], mp3):
                print(f"NOTE: {mp3.name} uses the fallback voice and is cached. "
                      f"Delete {audio_dir} to regenerate with the primary voice.", file=sys.stderr)
        new_manifest[mp3.name] = key
        dur = probe_duration(mp3)
        timeline.append({**seg, "audio": mp3.name, "start": round(cursor, 3), "end": round(cursor + dur, 3)})
        cursor += dur + episode.get("pause_sec", 0.4)
    manifest_path.write_text(json.dumps(new_manifest, indent=2), encoding="utf-8")
    return timeline


def align_clip(mp3: Path, text: str, out: Path) -> bool:
    """ElevenLabs forced alignment -> per-character times for an existing clip (audio unchanged).
    Writes [[char, start_sec], ...]. Returns False (subtitles fall back to estimates) on failure."""
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        return False
    boundary = uuid.uuid4().hex
    head = (f'--{boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n{text}\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="clip.mp3"\r\n'
            f"Content-Type: audio/mpeg\r\n\r\n").encode()
    body = head + mp3.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/forced-alignment", data=body,
        headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            chars = json.load(resp)["characters"]
    except (urllib.error.URLError, KeyError, ValueError) as e:
        print(f"WARNING: alignment failed for {mp3.name} ({e}) -> estimated word timing", file=sys.stderr)
        return False
    out.write_text(json.dumps([[c["text"], round(c["start"], 3)] for c in chars], ensure_ascii=False),
                   encoding="utf-8")
    return True


def ensure_alignments(episode: dict, timeline: list[dict], audio_dir: Path) -> None:
    """Attach cached per-character timings ("align" file name) to each timeline segment."""
    for seg in timeline:
        align = audio_dir / seg["audio"].replace(".mp3", ".align.json")
        stamp = audio_dir / seg["audio"].replace(".mp3", ".align.key")
        key = cache_key(episode, seg["text"])
        fresh = align.exists() and stamp.exists() and stamp.read_text() == key
        if fresh or align_clip(audio_dir / seg["audio"], strip_audio_tags(seg["text"]), align):
            stamp.write_text(key)
            seg["align"] = align.name


def mix_voice_track(timeline: list[dict], audio_dir: Path, total: float) -> Path:
    """Place clips on a silent base of exact length (amix duration=first; apad approach hung)."""
    inputs = ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=r=44100:cl=stereo"]
    filters = []
    for i, seg in enumerate(timeline, start=1):
        inputs += ["-i", str(audio_dir / seg["audio"])]
        delay = int(seg["start"] * 1000)
        filters.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={delay}|{delay}[v{i}]")
    mix = "[0:a]" + "".join(f"[v{i}]" for i in range(1, len(timeline) + 1))
    filters.append(f"{mix}amix=inputs={len(timeline) + 1}:duration=first:normalize=0[voice]")
    out = audio_dir / "voice.mp3"
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[voice]",
         "-t", f"{total:.3f}", "-c:a", "libmp3lame", "-b:a", "192k", str(out)])
    return out


def build_voice(episode_dir: Path) -> tuple[list[dict], float]:
    """Return (timeline, total_duration). Writes voice.mp3 and timeline.json."""
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    audio_dir = episode_dir / "audio"
    audio_dir.mkdir(exist_ok=True)
    timeline = synthesize_segments(episode, audio_dir)
    total = round(timeline[-1]["end"] + TAIL_SEC, 3)
    if total > MAX_DURATION_SEC:
        raise ValueError(f"Duration {total:.1f}s exceeds {MAX_DURATION_SEC}s limit — shorten the script")
    mix_voice_track(timeline, audio_dir, total)
    ensure_alignments(episode, timeline, audio_dir)
    (audio_dir / "timeline.json").write_text(
        json.dumps({"total": total, "segments": timeline}, ensure_ascii=False, indent=2), encoding="utf-8")
    return timeline, total


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    ep = Path(sys.argv[1]).resolve()
    _, total = build_voice(ep)
    print(f"Voice track: {ep / 'audio' / 'voice.mp3'} ({total:.1f}s)")

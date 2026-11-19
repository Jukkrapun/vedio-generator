"""Lip-sync an episode's voice onto the host's base talking video (video-to-video, fal.ai).

Usage:
    python tools/lipsync.py content/<series>/episodes/<episode> [--force] [--engine NAME] [--compare]

Needs in episode.json:  "host": {"base_video": "shared/characters/<host>/base/<file>.mp4",
                                 "lipsync": "<engine>"  (optional, default latentsync)}
Needs in .env:          FAL_KEY=...

Engines (prices checked 2026-11-19):
  latentsync  fal-ai/latentsync           $0.20/run up to 40s  — cheap, mouth looks over-smoothed
  sync-2      fal-ai/sync-lipsync/v2      $3/min (~$0.05/s)
  sync-2-pro  fal-ai/sync-lipsync/v2/pro  $5/min (~$0.083/s)  — best detail (teeth, close-ups)

Writes <episode>/video/host.mp4 and video/lipsync.json (voice hash + engine). Skips if host.mp4
already matches the current voice.mp3 and engine, so re-running never pays twice.
--compare writes video/host-<engine>.mp4 instead and leaves host.mp4 alone.
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

import fal_client
from dotenv import load_dotenv

from media import ROOT, probe_duration, run
from tts import build_voice

# engine -> (fal endpoint, extra arguments). Length mismatch: play the base clip back and forth.
ENGINES = {
    "latentsync": ("fal-ai/latentsync", {"loop_mode": "pingpong"}),
    "sync-2": ("fal-ai/sync-lipsync/v2", {"model": "lipsync-2", "sync_mode": "bounce"}),
    "sync-2-pro": ("fal-ai/sync-lipsync/v2/pro", {"sync_mode": "bounce"}),
}
DEFAULT_ENGINE = "sync-2"  # user choice 2026-11-19: sync-2 for value, sync-2-pro for hero clips
UPLOAD_CRF = 18  # re-encode the base clip (silent, trimmed) so uploads are smaller than the 65MB source


def file_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def prepare_base(base: Path, total: float, out: Path) -> Path:
    """Silent copy of the base clip trimmed to the voice length (LatentSync ping-pongs if shorter)."""
    length = min(probe_duration(base), total)
    run(["ffmpeg", "-y", "-i", str(base), "-t", f"{length:.3f}", "-an",
         "-c:v", "libx264", "-crf", str(UPLOAD_CRF), "-preset", "fast", "-pix_fmt", "yuv420p", str(out)])
    return out


def lipsync(episode_dir: Path, force: bool = False, engine: str | None = None, compare: bool = False) -> Path:
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    engine = engine or (episode.get("host") or {}).get("lipsync", DEFAULT_ENGINE)
    if engine not in ENGINES:
        raise ValueError(f"Unknown lip-sync engine '{engine}'. Options: {', '.join(ENGINES)}")
    endpoint, extra_args = ENGINES[engine]
    base_rel = (episode.get("host") or {}).get("base_video")
    if not base_rel:
        raise ValueError('episode.json needs "host": {"base_video": "shared/characters/.../base/<file>.mp4"}')
    base = ROOT / base_rel
    if not base.exists():
        raise FileNotFoundError(f"Base video not found: {base}")

    _, total = build_voice(episode_dir)
    voice = episode_dir / "audio" / "voice.mp3"
    video_dir = episode_dir / "video"
    video_dir.mkdir(exist_ok=True)
    name = f"host-{engine}" if compare else "host"
    out, meta_path = video_dir / f"{name}.mp4", video_dir / f"{name}.lipsync.json"
    voice_hash = file_hash(voice)
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    up_to_date = meta.get("voice_sha1") == voice_hash and meta.get("engine") == endpoint
    if out.exists() and up_to_date and not force:
        print(f"Up to date: {out} (voice unchanged) — use --force to redo")
        return out

    prepared = prepare_base(base, total, episode_dir / ".build-lipsync.mp4")
    try:
        print("Uploading base video + voice to fal ...")
        video_url = fal_client.upload_file(str(prepared))
        audio_url = fal_client.upload_file(str(voice))
        print(f"Running {endpoint} for {total:.1f}s of audio ...")
        result = fal_client.subscribe(
            endpoint,
            arguments={"video_url": video_url, "audio_url": audio_url, **extra_args},
            with_logs=False,
        )
    finally:
        prepared.unlink(missing_ok=True)

    urllib.request.urlretrieve(result["video"]["url"], out)
    meta_path.write_text(json.dumps({"engine": endpoint, "base_video": base_rel, "voice_sha1": voice_hash},
                                    indent=2), encoding="utf-8")
    print(f"Lip-sync video: {out} ({probe_duration(out):.1f}s)")
    return out


if __name__ == "__main__":
    argv = sys.argv[1:]
    engine_arg = argv[argv.index("--engine") + 1] if "--engine" in argv else None
    positional = [a for a in argv if not a.startswith("--") and a != engine_arg]
    if len(positional) != 1:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    lipsync(Path(positional[0]).resolve(), force="--force" in argv, engine=engine_arg, compare="--compare" in argv)

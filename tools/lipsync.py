"""Lip-sync episodes' voice onto the host look (MuseTalk on vast.ai, or video-to-video on fal.ai).

Usage:
    python tools/lipsync.py <episode> [<episode> ...] [--force] [--engine NAME] [--compare]

Several episodes = one batch: all MuseTalk clips run on ONE rented vast.ai instance
(rent + install once, destroyed at the end), so production should lip-sync many clips per run.

Needs in episode.json:  "host": {"character": "baitoey", "look": "<name>", "lipsync": "<engine>"}
Needs in .env:          VAST_API_KEY (musetalk) / FAL_KEY (fal engines)

Engines (prices checked 2026-11-19 / 2026-11-22):
  musetalk    MuseTalk 1.5 on a vast.ai GPU (tools/musetalk_vast.py), ~$0.08-0.10/h — input = look's
              base.mp4 if present, else its still scene.png (POC).
  latentsync  fal-ai/latentsync           $0.20/run up to 40s  — cheap, mouth looks over-smoothed
  sync-2      fal-ai/sync-lipsync/v2      $3/min (~$0.05/s)
  sync-2-pro  fal-ai/sync-lipsync/v2/pro  $5/min (~$0.083/s)  — best detail (teeth, close-ups)

Writes <episode>/video/host.mp4 and video/host.lipsync.json (voice hash + engine + base). Skips if
host.mp4 already matches, so re-running never pays twice.
--compare writes video/host-<engine>.mp4 instead and leaves host.mp4 alone.
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

import fal_client
from dotenv import load_dotenv

from media import ROOT, host_look, probe_duration, run
from musetalk_vast import infer, musetalk_session
from tts import build_voice

# engine -> (fal endpoint, extra arguments). Length mismatch: play the base clip back and forth.
ENGINES = {
    "latentsync": ("fal-ai/latentsync", {"loop_mode": "pingpong"}),
    "sync-2": ("fal-ai/sync-lipsync/v2", {"model": "lipsync-2", "sync_mode": "bounce"}),
    "sync-2-pro": ("fal-ai/sync-lipsync/v2/pro", {"sync_mode": "bounce"}),
    "musetalk": ("musetalk-1.5@vast", {}),
}
DEFAULT_ENGINE = "sync-2"  # for old episodes without "lipsync"; new templates set "musetalk"
UPLOAD_CRF = 18  # re-encode the base clip (silent, trimmed) so uploads are smaller than the 65MB source


def file_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def prepare_base(base: Path, total: float, out: Path) -> Path:
    """Silent copy of the base clip trimmed to the voice length (fal engines ping-pong if shorter)."""
    length = min(probe_duration(base), total)
    run(["ffmpeg", "-y", "-i", str(base), "-t", f"{length:.3f}", "-an",
         "-c:v", "libx264", "-crf", str(UPLOAD_CRF), "-preset", "fast", "-pix_fmt", "yuv420p", str(out)])
    return out


def plan(episode_dir: Path, force: bool = False, engine: str | None = None, compare: bool = False) -> dict:
    """Resolve one episode's inputs; job["todo"] is False if host.mp4 already matches."""
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    if not episode.get("host"):
        raise ValueError('episode.json needs "host": {"character": "baitoey", "look": "<name>"}')
    engine = engine or episode["host"].get("lipsync", DEFAULT_ENGINE)
    if engine not in ENGINES:
        raise ValueError(f"Unknown lip-sync engine '{engine}'. Options: {', '.join(ENGINES)}")
    look = host_look(episode["host"])
    base = look["base_video"]
    if engine == "musetalk" and base is None:
        base = look["scene"]  # POC: still image -> MuseTalk animates the mouth only
    if base is None:
        raise ValueError(f"Look '{look['name']}' has no base.mp4 — needed by {engine}; use --engine musetalk")
    if not base.exists():
        raise FileNotFoundError(f"Base not found: {base}")
    base_rel = base.relative_to(ROOT).as_posix()

    _, total = build_voice(episode_dir)
    voice = episode_dir / "audio" / "voice.mp3"
    video_dir = episode_dir / "video"
    video_dir.mkdir(exist_ok=True)
    name = f"host-{engine}" if compare else "host"
    out, meta_path = video_dir / f"{name}.mp4", video_dir / f"{name}.lipsync.json"
    endpoint = ENGINES[engine][0]
    voice_hash = file_hash(voice)
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    up_to_date = (meta.get("voice_sha1") == voice_hash and meta.get("engine") == endpoint
                  and meta.get("base_video", base_rel) == base_rel)
    todo = force or not (out.exists() and up_to_date)
    if not todo:
        print(f"Up to date: {out} (voice unchanged) — use --force to redo")
    return {"dir": episode_dir, "engine": engine, "endpoint": endpoint, "base": base, "base_rel": base_rel,
            "voice": voice, "total": total, "out": out, "meta_path": meta_path, "voice_sha1": voice_hash,
            "todo": todo}


def finish(job: dict) -> Path:
    job["meta_path"].write_text(json.dumps({"engine": job["endpoint"], "base_video": job["base_rel"],
                                            "voice_sha1": job["voice_sha1"]}, indent=2), encoding="utf-8")
    print(f"Lip-sync video: {job['out']} ({probe_duration(job['out']):.1f}s)")
    return job["out"]


def run_fal(job: dict) -> Path:
    endpoint, extra_args = ENGINES[job["engine"]]
    prepared = prepare_base(job["base"], job["total"], job["dir"] / ".build-lipsync.mp4")
    try:
        print("Uploading base video + voice to fal ...")
        video_url = fal_client.upload_file(str(prepared))
        audio_url = fal_client.upload_file(str(job["voice"]))
        print(f"Running {endpoint} for {job['total']:.1f}s of audio ...")
        result = fal_client.subscribe(
            endpoint,
            arguments={"video_url": video_url, "audio_url": audio_url, **extra_args},
            with_logs=False,
        )
    finally:
        prepared.unlink(missing_ok=True)
    urllib.request.urlretrieve(result["video"]["url"], job["out"])
    return finish(job)


def lipsync_many(episode_dirs: list[Path], force: bool = False, engine: str | None = None,
                 compare: bool = False) -> list[Path]:
    """Lip-sync several episodes. MuseTalk jobs share ONE vast.ai instance; fal jobs run one by one.
    Returns each episode's host video path (in input order)."""
    jobs = [plan(d, force, engine, compare) for d in episode_dirs]
    todo = [j for j in jobs if j["todo"]]
    failed = []
    for j in todo:
        if j["engine"] != "musetalk":
            run_fal(j)
    muse = [j for j in todo if j["engine"] == "musetalk"]
    if muse:
        print(f"MuseTalk batch: {len(muse)} clip(s) on one vast.ai instance")
        with musetalk_session() as c:
            for i, j in enumerate(muse, 1):
                print(f"[{i}/{len(muse)}] {j['dir'].name}")
                try:
                    infer(c, j["base"], j["voice"], j["out"], bbox_shift=0, fps=25)
                    finish(j)
                except Exception as e:  # keep going: the instance is already paid for
                    print(f"FAILED {j['dir'].name}: {e}", file=sys.stderr)
                    failed.append(j["dir"].name)
    if failed:
        raise RuntimeError(f"Lip-sync failed for: {', '.join(failed)} (others succeeded)")
    return [j["out"] for j in jobs]


def lipsync(episode_dir: Path, force: bool = False, engine: str | None = None, compare: bool = False) -> Path:
    return lipsync_many([episode_dir], force, engine, compare)[0]


if __name__ == "__main__":
    argv = sys.argv[1:]
    engine_arg = argv[argv.index("--engine") + 1] if "--engine" in argv else None
    positional = [a for a in argv if not a.startswith("--") and a != engine_arg]
    if not positional:
        sys.exit(__doc__)
    load_dotenv(ROOT / ".env")
    lipsync_many([Path(a).resolve() for a in positional], force="--force" in argv, engine=engine_arg,
                 compare="--compare" in argv)

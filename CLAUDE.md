# vdio-generator

Workspace for producing short-form vertical video content (Reels / TikTok / Shorts) with AI-generated assets. Organized by **series** so new content types can be added later.

## Layout

```
content/
  <series>/                 one folder per content series (e.g. love-quotes)
    series.md               format spec for this series — READ FIRST before working on it
    _template/              copy this to start a new episode
      episode.json          machine-readable script (voice, host, segments)
      script.md             human notes, caption, hashtags
      images/               B-roll stills
      audio/                cached TTS + voice.mp3 + timeline.json
      video/                host.mp4 lip-sync video (from ElevenLabs web)
    episodes/
      <NNN>-<YYYY-MM-DD>-<slug>/  one folder per episode; NNN = running number (production order)
shared/                     assets reused across series
  characters/<name>/        host persona.md, reference/, scenes/
  fonts/  music/  sfx/  brand/
output/<series>/            rendered videos (git-ignored)
```

## Channel

- Page name: **ตอนตีสอง** (handle idea `@ton.tee.song` — availability not checked yet). Chosen 2026-11-20.
- Concept: thoughts you have at 2 a.m. when you can't sleep — the channel covers many topics (love, work, horoscope, friends, trends), each as its own series. Host ใบเตย across all series.
- Tone for every series: quiet, late-night, honest; night/dim-light visuals fit the brand.
- Posting schedule (user's decision 2026-11-22, replaces 1 clip/day at 22:00; 2-week test until ~2026-12-06), Thai time, same clips reused across platforms (2–3 new clips/day):
  - TikTok: 2–3/day at **12:00 · 19:00 · 22:00**
  - YouTube Shorts: 2/day at **12:00 · 20:00**
  - Facebook Reels: 1–2/day at **20:00 · 22:00** (`publish_fb.py --at` takes any time)
  - YouTube long-form (night-stories, mode `story`, TH upload): 1/day at **21:00** (added 2026-11-24). Web platform key `youtube_long`; the planner only gives it story episodes and keeps them out of the short-form slots.
  - 22:00 = main "ตอนตีสอง" clip (strongest); daytime slots test new hooks/topics. Remake winners (part 2 / same hook).
  - After 2 weeks compare slots by completion rate and shares/saves; drop slots that underperform.
  - Whenever giving posting info, give the slot times above and suggest which clip goes in which slot. Image mode only for volume (video mode is POC in another session).
- TikTok (decided 2026-11-20): test the same clips as YouTube/Facebook first for 1–2 weeks, unchanged. Judge by completion rate (<~30% = format not working) and shares/saves, not views. If weak, options discussed: hook text on frame 1 (`-tiktok.mp4` renders), Baitoey video mode, a horoscope series, comment-reply clips.

## Current series

- `content/love-quotes/` — Thai love-quote podcast clips, 9:16, max 90s. See its `series.md`.
- `content/work-talk/` — Thai work-life clips (burnout, boss, quitting, career doubt), late-night look, 20–30s. See its `series.md`.
- `content/living-life/` — Thai adult-life clips (loneliness, friends, comparison, living alone, overthinking), image mode, ~20s. See its `series.md`.
- `content/poc/` — proofs of concept, never posted. One subfolder per experiment:
  - `poc/sound/` = nested series (`content/poc/sound/episodes/`, output `output/poc/sound/`, `catalog.py poc/sound`): 001–005 Thai voice test of ElevenLabs Mind (picked: 004 = `eleven_v4` default), 006–010 English voice test (story mode), 2026-11-23. Formerly `content/mockup/`. `media.series_path()` supports nested series for tools (produce/render/catalog/new_episode), and the ops dashboard shows them too: the web/worker series key for a nested series is `poc.sound` (dot = one URL segment, mapped back to `content/poc/sound`), and everything under `poc*` is listed in the web's "ทดสอบ" menu and kept out of the clips list and posting queue.
  - `poc/parallax/` = standalone experiment (own README, not in git).
  - `poc/night-stories/` = nested series: night-stories 001 (two-cups-of-noodles), 002 (the-last-bus), 003 (think-for-me) moved here 2026-11-24 (user: POC work, old small-mystery style). Output `output/poc/night-stories/`.
  - `poc/cat-2am/` = nested series "แมวตีสอง" (2026-11-24): episodic cartoon story narrated by the cat ส้มฉุน (`shared/characters/somchun/`), season plan + rules in its `series.md` (story-hook-framework B. Serial Reversal). Uses the episode keys `image_rules` (replaces the photorealistic default, here 2D cartoon) and `image_refs` (character sheet attached to the Codex run) added to `tools/images.py`. Episodes 001–003 written, 001 rendered. **POC PASSED (user, 2026-11-24) — no more POC work on it**; mode `image` + parallax, `"subtitles": "lower"`, per-episode `"parallax": {"margin": 0.06, "zoom": 0.06, "pan": 0.02}`.
- `content/night-stories/` — long-form YouTube stories (16:9, 8–15 min), **mode `story`**, one Thai + one English video per episode from the same images, separate playlists. Plan/status: `docs/long-form/PLAN.md`. Real episodes start at 004 night-train (bedtime-story format, 2026-11-24); the earlier POCs 001–003 are in `content/poc/night-stories/`.

## Workflows

**New episode:** `python tools/new_episode.py <series> <slug> [--mode image|video]` → creates `content/<series>/episodes/<NNN>-<YYYY-MM-DD>-<slug>/` from `_template/` with the next number. Output files reuse the folder name, so `output/<series>/` sorts in production order too. Fill `episode.json` + `script.md` + `publish.md`, follow that series' `series.md`.

**Publishing:** every episode has `publish.md` (from `_template/`) with ready-to-paste YouTube Shorts (title, description, playlist, settings), TikTok (caption, cover text, settings) and Facebook Reels (caption ending in a question, 2-3 hashtags, AI label) sections. Write it at the SAME time as the script — never leave it for later. Playlists: `ตอนตีสอง · เรื่อง<topic>` (one per series). Always tick the platform's AI-generated / altered-content label. When the user reports a post, append it to `episode.json` → `posts` and re-run `tools/catalog.py`.
- Facebook is automated: `python tools/publish_fb.py <episode> --at "YYYY-MM-DD 22:00"` uploads the Reel, schedules it (Thai time), logs the post and refreshes the catalog. Needs `FB_PAGE_ID`/`FB_PAGE_TOKEN` in `.env` (never-expiring Page token from `tools/fb_token.py`, app "tonteesong" in dev mode). The API can't set Meta's "AI info" label — remind the user to add it in Meta Business Suite. Always confirm with the user before a real (non `--dry-run`) post. YouTube needs an API audit before public uploads; TikTok needs an app audit — both still manual.

**Ops dashboard (web):** `docker compose up -d --build` → http://localhost:3800 (phone: `http://<pc-lan-ip>:3800`), login = `OPS_PASSWORD` in `.env` (+ `OPS_SESSION_SECRET`). Next.js app in `web/` (plan: `docs/ops-dashboard/PLAN.md`) reads/writes `episode.json` → `posts` directly; `ops/worker.py` runs queued jobs from `.ops/jobs/` (logs in `.ops/logs/`, schedule in `.ops/schedule.json`, slot picks in `.ops/picks.json`, all git-ignored, bind-mounted). **Render history:** the worker copies every new/changed `output/<series>/<slug>-<mode>.mp4` to `output/<series>/history/<slug>/<YYYYMMDD-HHMMSS>-<mode>.mp4` (+ `.json`: mode, time, duration, spoken lines) — all takes are kept; the user picks one in the web ("ประวัติ" tab) which sets `episode.json` → `"publish_version"` (absent = newest take of the current mode). Posts made from the web record `"version"`; FB scheduling passes the chosen take via `publish_fb.py --video <path>`. One topic is posted once per platform. **Production pipeline** (`docs/ops-dashboard/PIPELINE.md`): "งาน" page = one card per order made from a `PROMPTS.md` template (sections whose heading starts with ทำ/เขียน; `[a / b]` → fields); the worker runs `claude -p` (scripts only; tools limited to Read/Write/Edit/Glob/Grep + `new_episode.py`/`catalog.py`), tags new episodes with `episode.json` → `"review": {"stage": "script|images|voice|render|done|dropped", "order"}`, and each stage is approved in the web (`/review/<series>/<slug>`), which queues the next job (images.py / tts.py / render_reel.py; regen one image or one voice segment). Episodes with a review stage other than `done` are kept out of the posting queue. Only one worker is active (`.ops/worker.json` heartbeat); `ops/start-worker.ps1` runs it on the host (needed for claude/codex). Docker worker can't run Codex images or MuseTalk — run `.venv\Scripts\python.exe ops/worker.py` on the host for those (stop the Docker worker first so only one worker runs).

**Writing & editing skills (`.claude/skills/`):** use both whenever writing, rewriting or reviewing an episode (script, segments, image prompts, cards, sound, render QA):
- `story-hook-framework` — story/script: 1.5s hook, open loop within 3s, visual change every 3–5s, climax = Kishōtenketsu twist (standalone shorts) or Serial Reversal (episodic series).
- `vertical-edit-techniques` — editing for 9:16: phone framing + safe zones, shot choice by emotion, pause before key lines, J/L-cuts, reaction shots, readable subtitles, voice above music, hard cuts by default, cliffhanger ending, check on a phone before export.
- `art-director` — neutral (not channel-specific): picks the look from each content, proposes 2–3 distinct directions, anti-repetition vs recent episodes, 4-block image prompts, visual QA. Channel constraints live in `shared/brand/style-bible.md`: Layer 1 identity + Layer 2 quality are binding; Layer 3 mood (late-night default) may change per series/episode.
- Reviews give a table per rule (✅/⚠️/❌ + segment + concrete fix). The series' `series.md` and the channel tone win over both skills.

**New series:** create `content/<new-series>/` with its own `series.md`, `_template/`, `episodes/`, plus `output/<new-series>/`. Add it to "Current series" above.

## Production modes (`"mode"` in episode.json)

- `"image"` (default, start here): Codex image per segment (`image` + `image_prompt`, shared `image_style`) + slow camera move + voice + subtitles (centered). Cost: voice credits + Codex quota only.
  - **Motion (since 2026-11-23): 2.5D parallax by default** (`tools/parallax.py`): Depth Anything V2 Small on CPU makes a depth map per image, cached in `images/.depth/<stem>.png` (committed; rebuilt when the image is newer), then a depth-weighted dolly-in with sideways drift alternating per clip. `produce.py` builds missing depth maps; `render_reel.py` falls back to flat zoom (warning) if opencv/depth fail. `"motion": "zoom"` in episode.json = old Ken Burns. Needs torch CPU + transformers only to MAKE depth maps (host `.venv`); rendering needs numpy + opencv. `render_story.py` (long-form) uses parallax too since 2026-11-24 (same `motion`/`parallax` keys; ~9 min per language for a 2-min story on CPU). POC/comparisons: `content/poc/parallax/`, `output/poc/parallax/`.
- `"video"`: host lip-synced + voice + subtitles (lower third, punch-in). Segments may still cut to images with `"visual": "image"`.
  - **Look per episode (1 episode = 1 look):** `"host": {"character": "baitoey", "look": "<name>", "lipsync": "musetalk"}`. Looks live in `shared/characters/baitoey/looks/<name>/` (`scene.png`, `look.md` with mood/fits, optional `base.mp4`). Pick the look whose "Fits" matches the content; reuse when it fits, otherwise create a new look (outfit + background) — see `looks/README.md`. Old `scene`/`base_video` keys still work and override the look.
  - **Lip-sync POC is PAUSED (user, 2026-11-23)** — results, costs and next steps in `docs/lipsync-poc/SUMMARY.md`. MuseTalk quality rejected; InfiniteTalk (`tools/infinitetalk_vast.py`, A100) lip-syncs well but the face drifts/looks worse. vast credit left ~$0.77 and billing was higher than the scripts' estimates — check real credit before any new run.
  - **Lip-sync engine `musetalk` (default since 2026-11-22, POC):** MuseTalk 1.5 on vast.ai via `tools/musetalk_vast.py`. User does NOT keep an instance running: each job rents the cheapest matching GPU (`vastai` CLI), installs MuseTalk + weights, runs, downloads `video/host.mp4`, then destroys the instance (also on errors). Live id kept in `.vast-instance.json` until destroyed; `--cleanup` kills leftovers, `--offers` lists prices. Input = look's `base.mp4` if present, else the still `scene.png` (POC: only the mouth moves). `.env`: `VAST_API_KEY` (required), optional `VAST_SSH_KEY`, `VAST_QUERY`, `VAST_MAX_DPH` (0.6). The user's SSH public key must be in vast.ai → Account → SSH Keys. Setting `VAST_SSH_HOST`/`VAST_SSH_PORT` switches to a fixed, user-managed instance instead. Real runs cost money — confirm with the user first. **Prebuilt image** `VAST_IMAGE=jukkrapundocker/vdio-musetalk:1.5` (public Docker Hub, built from `docker/musetalk/`, MuseTalk + all weights baked in) skips the ~7 min install; first success 2026-11-22 on work-talk 005: rent 10s, boot+pull 2m, setup 17s, upload 41s, inference 3m49s (20s clip), download 2m, total ≈ 9.5 min ≈ $0.01. **Batch in production** (user's decision 2026-11-22): pass several episodes to `produce.py`/`lipsync.py` so all MuseTalk clips share one instance (setup ~10-20 min paid once); POC = 1 clip. Offer filter `VAST_QUERY` in `.env`: no China hosts, RTX 20xx–40xx / RTX A-series only (no T4/P100/V100, no Blackwell — torch 2.0.1 can't run it). fal engines remain (need `base.mp4`).

- `"story"` (long-form, separate renderer `tools/render_story.py`; shorts code untouched): 1920x1080, no length limit, `languages` {th, en} + per-segment `text: {th, en}`, segments may share an `image`, voice cached in `audio/<lang>/`, bottom line subtitles, output `output/<series>/<ep>-story-<lang>.mp4` + `.chapters.txt`. The ops worker's history doesn't pick these up yet.

```powershell
python tools/produce.py content/<series>/episodes/<episode>   # does everything for the episode's mode
```
`produce.py` = `images.py` (missing images only) → `tts.py` → `lipsync.py` (video mode) → `render_reel.py`. Every step is cached.

## Rendering

```powershell
python tools/images.py content/<series>/episodes/<episode>      # Codex: create missing segment images
python tools/tts.py content/<series>/episodes/<episode>         # voice only -> audio/voice.mp3
python tools/lipsync.py content/<series>/episodes/<episode>     # voice + LatentSync -> video/host.mp4
python tools/render_reel.py content/<series>/episodes/<episode>  # full render (runs tts.py too)
```

- Lip-sync (`tools/lipsync.py`): fal.ai `fal-ai/latentsync` (video-to-video), `FAL_KEY` in `.env`, $0.20/run up to 40s. Input = host's `base_video` (real talking footage in `shared/characters/<host>/base/`) + voice.mp3, `loop_mode: pingpong`. Records voice hash + engine in `video/host.lipsync.json` and skips if unchanged (`--force` to redo).
  - Engines via `host.lipsync` or `--engine`: `latentsync` ($0.20, user rejected: mouth over-smoothed), `sync-2` (~$0.05/s), `sync-2-pro` (~$0.083/s). `--compare` writes `video/host-<engine>.mp4` without touching host.mp4. Compared 2026-11-19 on episode be-yourself; outputs in `output/love-quotes/004-2026-11-19-be-yourself-<engine>.mp4`.
- New scene without base video: user makes one in the ElevenLabs web app (Lip sync → Avatar + Speech, ~27k credits), then it is saved to `base/` and reused.

- Code: `tools/media.py` (ffmpeg helpers/constants), `tools/tts.py` (TTS + cache), `tools/render_reel.py` (compose).
- **HyperFrames overlay (opt-in, added 2026-11-25):** `"overlay": "hyperframes"` in episode.json replaces the burned ASS subtitles with a transparent graphics layer rendered by HyperFrames (`tools/overlay_hf.py` + template `tools/hyperframes/overlay.html`, CLI pinned `hyperframes@0.9.93` via `npx`, needs Node 22+ and Chrome — host only, not the Docker worker yet): animated word-by-word captions (rise + unblur, gold glow), dust motes, vignette, "ตอนตีสอง" end card (`"overlay_opts": {"dust", "vignette", "endcard"}` to turn parts off). Falls back to ASS subtitles if the overlay fails. Adds ~2–3 min per clip. `render_reel.py <ep> --tiktok` writes `<ep>-<mode>-tiktok.mp4` with big hook text on frame 1 (`"hook_text"` or the first card) — the TikTok hook variant. POCs (captions, 3D chibi, VRoid/VRM lip-sync) in `content/poc/hyperframes/`, outputs in `output/poc/hyperframes/`.
- TTS is cached per segment in `<episode>/audio/` (`manifest.json` hashes text+voice settings). Re-renders don't re-bill ElevenLabs; fallback audio is not cached so it's retried.
- Input: the episode's `episode.json` (voice, segments with `text` for TTS, `cards` for on-screen subtitle cards, optional `music` path relative to repo root).
- Visuals: if `episode.json` has a `host` block, segments default to `"visual": "host"` = lip-sync video `<episode>/video/host.mp4` (made by the user in the ElevenLabs web app from `audio/voice.mp3` + host scene). If that file is missing, a PREVIEW is rendered from the still `host.scene` image. Segments with `"visual": "image"` use their `image` (Ken Burns). Without `host`, every segment is an image.
- Shorten an episode AFTER lip-sync with `"skip": true` on segments: the same source windows are cut from voice.mp3 and host.mp4 (split at mid-pause), so lips stay in sync and no new lip-sync is needed. Editing `text` instead changes the voice and requires a new lip-sync.
- TTS cache always keeps what was produced, including fallback audio, so `voice.mp3` never changes under an existing lip-sync video. To regenerate the voice (e.g. after upgrading ElevenLabs), delete `<episode>/audio/` AND redo the lip-sync.
- Characters live in `shared/characters/<name>/` (`persona.md`, `reference/`, `scenes/`); index in `shared/characters/README.md`; copy `shared/characters/_template/` for a new one (full bible: identity, art style from `reports/สไตล์*.md`, locked look, Character block EN+TH, tested voice, emotion range). Design once, reuse. Plan: `docs/characters/PLAN.md`. Machine side `character.json` (`tools/characters.py`): episode keys `"characters": ["somchun"]` (image block + refs into `images.py`), `"narrator": "somchun"` (voice for `tts.py`, explicit episode keys win), `"style_anchor": true` (attach `content/<series>/style-anchor.png`). Voice check: `tools/voice_samples.py <name>`. Web: "ตัวละคร" page (`/characters`) shows refs/samples/usage and edits `character.json`.
- Output: `output/<series>/<episode>-<mode>.mp4` (one file per mode, e.g. `-image.mp4` and `-video.mp4` side by side; `media.output_path()`; catalog and `publish_fb.py` use the episode's current `mode`, `publish_fb.py --mode` overrides), 1080x1920 30fps H.264/AAC, burned-in Thai subtitles (Leelawadee via libass). Fails if longer than 90s.
- TTS engine is chosen per episode with `"tts"` in `episode.json`:
  - `"edge"` (default, free): `voice` = `th-TH-PremwadeeNeural` (female) / `th-TH-NiwatNeural` (male). Intermittently returns no audio — the script retries.
  - `"elevenlabs"`: `voice` = ElevenLabs voice_id, optional `model` (default `eleven_v3`). Key is `ELEVENLABS_API_KEY` in `.env` (git-ignored, never print it).
    - Account is on the **Creator plan, annual billing** (checked 2026-11-23: limit 130,799 chars/month, credits reset monthly, next reset 2026-12-23 15:21 Thai time; annual renewal ~2027-11-23, $235.40). Earlier it was on Starter (38,950 chars/month, from 2026-11-19). Check usage with `GET /v1/user/subscription`. Library voices work via API. Video/lip-sync is done by the user in the ElevenLabs web app (Lip sync → Avatar + Speech), not via API (needs Pro).
    - Some library voices are unusable even when paid: API returns 400 "not fine-tuned" (owner's training failed) — e.g. Mali `7XW5JhaNn90bnFojQ5DA`.
    - Thai works with `eleven_v3` and `eleven_v4` (v4 tested 2026-11-23 with voice Mind `gbZNaSxK771GgOTJIKRB`); `eleven_multilingual_v2` rejects `language_code: th`.
    - Optional `"voice_settings": {"stability", "similarity_boost", "style", "speed"}` in episode.json is passed to ElevenLabs (it is part of the cache key only when set).
  - Optional `"fallback": {"tts": "edge", "voice": ...}` is used when ElevenLabs returns 402 (warning printed). v3 audio tags like `[softly]` are stripped automatically for edge-tts.
- Each series' default voice is in its `series.md` and `_template/episode.json`.
- Ready-made user prompts live in `PROMPTS.md`.
- Topic tracking: `content/<series>/catalog.md` (generated by `tools/catalog.py <series>`, auto-run by `produce.py`; never hand-edit) lists every episode's tags, status, results and spoken lines; `ideas.md` is the backlog. Read both before writing new episodes. Post results go in `episode.json` → `"posts"`.
- Subtitles (`tools/subtitles.py`): word-by-word reveal, spoken word highlighted gold, unspoken words drawn transparent so layout never shifts. Word times come from ElevenLabs forced alignment of each cached clip (`audio/NN-*.align.json`, audio unchanged so lip-sync stays valid); Thai words split with pythainlp; falls back to char-weighted estimates if alignment fails. Cards may differ slightly from spoken text (matched with a look-ahead window).
- Punch-in: host segments alternate wide / 1.18x zoom around the face (`"punch_in": false` in episode.json to disable). Only applied when a real lip-sync `video/host.mp4` exists.
- Subtitle font: `"font": "shared/fonts/<file>.ttf"` in `episode.json` (default IBM Plex Sans Thai SemiBold). Style: text only, no background box — white with black outline + soft shadow. Family name is read from the file via fontTools. Fonts in `shared/fonts/` are Google Fonts (OFL, free for commercial use).
- Requires ffmpeg on PATH and `pip install edge-tts python-dotenv fonttools fal-client pythainlp`. Intermediate files go to `<episode>/.build/` (git-ignored).

## Image generation (Codex)

Images are generated with the Codex CLI (logged in via ChatGPT account, no API key needed):

```powershell
codex exec --skip-git-repo-check "Generate an image using your image generation tool: <prompt>, vertical 9:16. Then report the saved file path."
```

- Codex saves to `%USERPROFILE%\.codex\generated_images\<session-id>\`. Copy results into the episode's `images/` folder with descriptive kebab-case names (e.g. `01-hook-bg.png`).
- One image takes up to a few minutes and ~30k tokens of the ChatGPT quota — batch sensibly.
- If it fails with "Not logged in", the user must run `codex login` themselves (interactive).
- Use the aspect ratio from the series' `series.md` (love-quotes = 9:16).
- Same face across images: attach a generated (fictional) host image with `--image <path>` placed AFTER the prompt — `-i`/`--image` before the prompt swallows the prompt as an image path.
- Never send photos of real people to Codex; describe only general style traits in text. User inspiration photos go in `shared/characters/_inspiration/` (git-ignored).
- Image prompt library: `PROMPTS.md` section 8.
- **Thai prompt for review (user, 2026-11-24):** every segment with an English `image_prompt` also gets `image_prompt_th` = a faithful Thai translation (the user reads/edits Thai in the web). Codex always gets the English `image_prompt`; keep both in sync. A Thai edit in the web is translated back to English by the worker (`claude -p`) before the image is (re)generated.

## Git & files outside git

- Repo initialised 2026-11-20 (branch `main`). Commit after meaningful changes; never edit docs with blind bulk-replace scripts — use the Edit tool (a PowerShell replace bug once corrupted PROMPTS.md/persona.md).
- Not in git (see `.gitignore`): `.env`, `output/`, all `*.mp4` (lip-sync results, `shared/characters/*/base/*.mp4` — irreplaceable, ~27k ElevenLabs credits each; back up to cloud), `_archive/` (old experiments: candidate host images, lip-sync comparisons, edge-vs-ElevenLabs test), `shared/characters/_inspiration/`.
- Python deps: `pip install -r requirements.txt`.
- Local setup (2026-11-21): project venv at `.venv/` (Python 3.13 via `uv`, git-ignored). Run tools with `.venv\Scripts\python.exe tools/<script>.py ...` (or activate `.venv\Scripts\Activate.ps1`); bare `python` hits the Microsoft Store alias. ffmpeg installed via winget (`Gyan.FFmpeg`).
- **ffmpeg/ffprobe PATH gotcha:** winget's ffmpeg is on PowerShell's PATH only — Git Bash (Claude's Bash tool) can't see it, which once crashed `produce.py` (`WinError 2`) and made the catalog show `?` durations. `tools/media.py` now adds the winget bin dir (or `FFMPEG_DIR` from env) to PATH automatically on import, so Python tools work from any shell. Bare `ffmpeg`/`ffprobe` typed in Git Bash still won't resolve — run them from PowerShell or use the full path `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\`.

## Conventions

- Reply to the user in Thai; code, filenames and commit messages in English.
- Folder and file names: lowercase kebab-case, no spaces or Thai characters.
- Shell is PowerShell on Windows.

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

## Current series

- `content/love-quotes/` — Thai love-quote podcast clips, 9:16, max 90s. See its `series.md`.

## Workflows

**New episode:** `python tools/new_episode.py <series> <slug> [--mode image|video]` → creates `content/<series>/episodes/<NNN>-<YYYY-MM-DD>-<slug>/` from `_template/` with the next number. Output files reuse the folder name, so `output/<series>/` sorts in production order too. Fill `episode.json` + `script.md`, follow that series' `series.md`.

**New series:** create `content/<new-series>/` with its own `series.md`, `_template/`, `episodes/`, plus `output/<new-series>/`. Add it to "Current series" above.

## Production modes (`"mode"` in episode.json)

- `"image"` (default, start here): Codex image per segment (`image` + `image_prompt`, shared `image_style`) + slow zoom + voice + subtitles (centered). Cost: voice credits + Codex quota only.
- `"video"`: host base video lip-synced (Sync on fal) + voice + subtitles (lower third, punch-in). Segments may still cut to images with `"visual": "image"`.

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
- TTS is cached per segment in `<episode>/audio/` (`manifest.json` hashes text+voice settings). Re-renders don't re-bill ElevenLabs; fallback audio is not cached so it's retried.
- Input: the episode's `episode.json` (voice, segments with `text` for TTS, `cards` for on-screen subtitle cards, optional `music` path relative to repo root).
- Visuals: if `episode.json` has a `host` block, segments default to `"visual": "host"` = lip-sync video `<episode>/video/host.mp4` (made by the user in the ElevenLabs web app from `audio/voice.mp3` + host scene). If that file is missing, a PREVIEW is rendered from the still `host.scene` image. Segments with `"visual": "image"` use their `image` (Ken Burns). Without `host`, every segment is an image.
- Shorten an episode AFTER lip-sync with `"skip": true` on segments: the same source windows are cut from voice.mp3 and host.mp4 (split at mid-pause), so lips stay in sync and no new lip-sync is needed. Editing `text` instead changes the voice and requires a new lip-sync.
- TTS cache always keeps what was produced, including fallback audio, so `voice.mp3` never changes under an existing lip-sync video. To regenerate the voice (e.g. after upgrading ElevenLabs), delete `<episode>/audio/` AND redo the lip-sync.
- Characters live in `shared/characters/<name>/` (`persona.md`, `reference/`, `scenes/`); copy `shared/characters/_template/` for a new one.
- Output: `output/<series>/<episode>.mp4`, 1080x1920 30fps H.264/AAC, burned-in Thai subtitles (Leelawadee via libass). Fails if longer than 90s.
- TTS engine is chosen per episode with `"tts"` in `episode.json`:
  - `"edge"` (default, free): `voice` = `th-TH-PremwadeeNeural` (female) / `th-TH-NiwatNeural` (male). Intermittently returns no audio — the script retries.
  - `"elevenlabs"`: `voice` = ElevenLabs voice_id, optional `model` (default `eleven_v3`). Key is `ELEVENLABS_API_KEY` in `.env` (git-ignored, never print it).
    - Account is on the **Starter plan** (38,950 chars/month; upgraded 2026-11-19). Library voices work via API. Video/lip-sync is done by the user in the ElevenLabs web app (Lip sync → Avatar + Speech), not via API (needs Pro).
    - Some library voices are unusable even when paid: API returns 400 "not fine-tuned" (owner's training failed) — e.g. Mali `7XW5JhaNn90bnFojQ5DA`.
    - Thai only works with `eleven_v3`; `eleven_multilingual_v2` rejects `language_code: th`.
  - Optional `"fallback": {"tts": "edge", "voice": ...}` is used when ElevenLabs returns 402 (warning printed). v3 audio tags like `[softly]` are stripped automatically for edge-tts.
- Each series' default voice is in its `series.md` and `_template/episode.json`.
- Ready-made user prompts live in `PROMPTS.md`.
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

## Git & files outside git

- Repo initialised 2026-11-20 (branch `main`). Commit after meaningful changes; never edit docs with blind bulk-replace scripts — use the Edit tool (a PowerShell replace bug once corrupted PROMPTS.md/persona.md).
- Not in git (see `.gitignore`): `.env`, `output/`, all `*.mp4` (lip-sync results, `shared/characters/*/base/*.mp4` — irreplaceable, ~27k ElevenLabs credits each; back up to cloud), `_archive/` (old experiments: candidate host images, lip-sync comparisons, edge-vs-ElevenLabs test), `shared/characters/_inspiration/`.
- Python deps: `pip install -r requirements.txt`.

## Conventions

- Reply to the user in Thai; code, filenames and commit messages in English.
- Folder and file names: lowercase kebab-case, no spaces or Thai characters.
- Shell is PowerShell on Windows.

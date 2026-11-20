# Series: love-quotes (คำคมความรัก)

Short podcast-style love quote clips for Reels / TikTok / Shorts.

## Format spec

| Item | Value |
|------|-------|
| Aspect ratio | 9:16 vertical |
| Resolution | 1080x1920 |
| Max duration | 90 seconds (hard limit) |
| Target duration | 30–60 seconds |
| Language | Thai |

## Voice

- Default: ElevenLabs **Hammy - Warm & friendly** (`MYZYcGOqrkYQcwDunXl7`), model `eleven_v3`, calm warm Thai female.
- (Mali `7XW5JhaNn90bnFojQ5DA` was the first choice but its fine-tuning is broken on the owner's side — API returns "not fine-tuned". Re-check later if wanted.)
- If ElevenLabs refuses (402), the renderer warns and falls back to edge-tts `th-TH-PremwadeeNeural` (`episode.json` → `fallback`).
- Use v3 audio tags (`[softly]`, `[warmly]`, `[sighs]`) in `text` only, at most one per segment. Never in `cards`.

## Topic tracking (check before writing)

- `catalog.md` — generated list of every episode: tags, status, length, results, and every line already spoken. Refresh with `python tools/catalog.py love-quotes` (`produce.py` does it automatically).
- Before writing a new episode: read `catalog.md` + `ideas.md`. Don't reuse a hook/quote line or the same angle on a topic; a well-performing tag may be revisited with a NEW angle.
- `ideas.md` — topic backlog. Take ideas from here, remove them once an episode exists.
- In `episode.json`: `"tags"` (kebab-case English, reuse existing tags) and `"posts"` — append `{"platform","date","url","views","likes","saves"}` when the user reports a post/results, then re-run the catalog. Status: draft → rendered → posted.

## Clip structure

1. **Hook** (0–3s) — a line that stops the scroll
2. **Quote / story** — the main love quote, voiced podcast-style
3. **Closing** (last 3–5s) — takeaway line + call to action (follow/save)

## Format: talking-head quote podcast

- Host: **ใบเตย (baitoey)** — `shared/characters/baitoey/persona.md`. Concept: she is a guest on a talk-show sofa sharing quotes, short stories, attitudes and life lessons (first-person storytelling works well: "มีคนเคยถามฉันว่า...").
- Scene by mood: `01-leather-sofa` (default), `02-velvet-sofa-evening` (deep/sad), `03-boucle-sofa-cozy` (gentle/self-love).
- One fictional female host (27–30) talks to camera for most of the clip. Host persona, look and scenes live in `shared/characters/<host>/` — **always reuse the same host and her scenes** for face consistency.
- Optional short B-roll cutaways: set `"visual": "image"` on a segment (1–2 per clip max).
- Burned-in Thai subtitles in the lower third (`"subtitles": "lower"`, default when `host` is set), inside the safe area (avoid top 250px and bottom 400px).
- Background music from `shared/music/`, ducked under voice.

## Modes

- **image (default — start here):** each segment gets a Codex image from `image_prompt` (atmosphere shots, people from behind / no clear faces) + slow zoom + voice + word-by-word subtitles. Cheap, good for testing topics. `python tools/produce.py <episode>`.
- **video:** Baitoey talks to camera (lip-sync). Use for topics that already performed well. Set `"mode": "video"`.

## Production workflow — video mode (Sync lipsync-2 on fal, fully automatic)

1. `python tools/new_episode.py love-quotes <slug> --mode video` → `episodes/<NNN>-<date>-<slug>/`, write `episode.json` (+ `script.md`). Keep ~4 segments / ~20–25s.
2. `python tools/lipsync.py <episode>` → voice (ElevenLabs Hammy) + lip-sync on the host's `base_video` → `video/host.mp4`. Skips if voice/engine unchanged.
   - `"lipsync": "sync-2"` (default, ~$1 per 20s) — regular clips.
   - `"lipsync": "sync-2-pro"` (~$1.70 per 20s) — user's preferred quality; use for hero/important clips.
   - `latentsync` is available but rejected (mouth over-smoothed).
3. `python tools/render_reel.py <episode>` → final video.

Only needs the ElevenLabs web flow below for a NEW scene (no base video yet). The result then becomes that scene's base video in `shared/characters/<host>/base/`.

## Production workflow for a new scene (lip-sync via ElevenLabs web app, expensive ~27k credits)

1. `python tools/new_episode.py love-quotes <slug> --mode video`, write `episode.json` (+ `script.md` with caption/hashtags).
2. `python tools/tts.py <episode>` → `audio/voice.mp3` (cached; only changed segments are re-synthesized).
3. `python tools/render_reel.py <episode>` → **preview** with the still host scene (check timing/subtitles).
4. User: ElevenLabs web → Avatars / Image & Video lip-sync → upload the host scene image + `audio/voice.mp3` → download → save as `<episode>/video/host.mp4`.
   Upload the audio file rather than retyping text, otherwise lip-sync timing won't match the subtitles.
5. `python tools/render_reel.py <episode>` again → final video with lip-sync.
6. Too long? Add `"skip": true` to whole segments — cuts voice + lip-sync video together (jump cut), no new lip-sync. Don't edit `text` after lip-sync.

Target length: keep scripts to ~25s (4 segments) — the 34s first episode felt long. Lip-sync cost scales with length, so write short.

Post with the platform's "AI-generated" label turned on (realistic synthetic person).

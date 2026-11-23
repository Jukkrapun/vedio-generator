# Long-form stories for YouTube: plan

Decided with the user 2026-11-23. Status: **POC in progress**.

## Goal

Long YouTube videos (8–15 min, 16:9) on the ตอนตีสอง channel: quiet late-night stories that ใบเตย
narrates, in **two languages**. Every episode is made as one Thai clip and one English clip from the
SAME images. The two clips go in different playlists.

- Thai playlist: `ตอนตีสอง · เรื่องเล่าก่อนนอน`
- English playlist: `2 A.M. Stories`
- Set the video language and the title/description language correctly on every upload.
- After 2–4 weeks, if the English clips get views but pull the channel's overall numbers down,
  move them to a separate English channel. The files are already separate, so this is easy.

## Rules

1. **New mode `"story"`, existing work untouched.** `image` and `video` mode, `render_reel.py`,
   the 90 s limit, the shorts' subtitles and the ops worker's history regex all stay as they are. Story
   mode has its own renderer, `tools/render_story.py`. Shared code only gets small changes that are
   backward compatible and keep the defaults (see below).
2. English is **rewritten** so it sounds natural, not translated word for word.
3. Series `content/night-stories/` (Thai: เรื่องเล่าตอนตีสอง).

## Format (story mode)

| Item | Value |
|---|---|
| Aspect | 16:9, 1920x1080, 30 fps |
| Length | target 8–15 min (POC ~3 min), no hard limit |
| Visuals | 1 image per ~20–40 s, very slow Ken Burns across the whole span, fade through black between images |
| Subtitles | bottom, one short line at a time, white with outline (no word-by-word highlight) |
| Audio | voice + optional music bed (`music`), longer pauses (`pause_sec` ~0.8) |
| Chapters | segments with `"chapter"` → `output/.../<ep>-story-<lang>.chapters.txt` (paste into the YouTube description) |
| Output | `output/night-stories/<ep>-story-th.mp4`, `<ep>-story-en.mp4` |

## episode.json (story)

```json
{
  "mode": "story",
  "languages": {
    "th": {"title": "...", "tts": "edge", "voice": "th-TH-PremwadeeNeural", "rate": "-10%"},
    "en": {"title": "...", "tts": "edge", "voice": "en-US-AvaNeural", "rate": "-8%"}
  },
  "pause_sec": 0.8,
  "image_style": "...",
  "segments": [
    {"id": "s01", "chapter": {"th": "...", "en": "..."}, "image": "images/01-x.png",
     "image_prompt": "...", "text": {"th": "...", "en": "..."}}
  ]
}
```

- Several consecutive segments may share one `image` (they become one long span).
- Per-language TTS settings work like the shorts' settings (`tts`, `voice`, `model`, `rate`,
  `fallback`), plus `language` for ElevenLabs (`th`/`en`).
- Audio is cached per language in `audio/<lang>/`, the same way as the shorts' cache.

## Shared code changes (backward compatible)

- `media.run(..., timeout=)`: optional timeout. A long render takes more than 300 s.
- `tts.synthesize_elevenlabs(..., language="th")`: the language code is passed in, default unchanged.
  It is not added to the cache key, so existing caches stay valid.
- `images.py`: landscape rules (1536x1024) when `mode == "story"`.
- `produce.py`, `new_episode.py`: accept `story` and send it to `render_story.py`.
- `catalog.py`: reads `text` as a dict (uses Thai), and the story status comes from `-story-th.mp4`.

## Cost per 10-minute episode (estimate)

- Images: 15–30 Codex images (ChatGPT quota, the main bottleneck).
- Voice: edge-tts is free. ElevenLabs uses ~6–8k chars per language, so ~12–16k for TH+EN. The
  Starter plan's 38,950 chars/month is shared with the shorts.

## Steps

1. [x] Plan (this file).
2. [x] POC: `render_story.py` + shared changes + series scaffold.
3. [x] POC episode 001 `two-cups-of-noodles`, TH 2:00 / EN 1:57, edge-tts, 6 images (2026-11-23).
   Render time: ~3 min per language for 2 min of video → expect ~15 min for a 10-min TH+EN episode.
   Subtitle timing is estimated by character count (edge-tts word boundaries could make it exact).
4. [ ] User review → adjust → first full 8–10 min episode (ElevenLabs voice if credits allow).
5. [ ] Later: horizontal thumbnail (Codex + title text), music bed, an ops dashboard tab for story
   takes (the worker's history regex currently only covers image|video), and optionally a compilation
   mode (join shorts into a "15-minute" video).

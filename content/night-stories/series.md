# Series: night-stories (เรื่องเล่าตอนตีสอง / 2 A.M. Stories)

Long-form YouTube stories for the channel **ตอนตีสอง**. Quiet fictional stories that ใบเตย narrates,
for people who can't sleep. **Mode `story` only.** Every episode = one Thai video and one English video
made from the same images. Plan: `docs/long-form/PLAN.md`.

## Format spec

| Item | Value |
|------|-------|
| Aspect ratio | 16:9 horizontal, 1920x1080 |
| Target duration | 8–15 min (POC 3 min), no hard limit |
| Images | 1 per ~20–40 s, several segments may share one `image` |
| Languages | `th` + `en` in one episode.json (`text: {"th", "en"}`) |
| Output | `output/night-stories/<ep>-story-th.mp4` / `-story-en.mp4` (+ `.chapters.txt`) |

## Voice

- POC: edge-tts (free). TH `th-TH-PremwadeeNeural` rate -10%, EN `en-US-AvaNeural` rate -8%.
- Production: ElevenLabs if credits allow (`"language": "en"` for English). A 10 min episode is about
  6–8k chars per language.

## Writing

- Fictional, everyday, late-night: convenience stores, last trains, rain, unsent letters, old flats.
  No real people, no horror gore, no medical/money advice.
- Slow pace and short sentences. One segment = 1–3 sentences (~10–20 s). `"\n"` forces a subtitle break.
- English is a natural **rewrite**, not a word-for-word translation. Names/places may be localized.
- Structure: quiet opening scene → small mystery/person → reveal (gentle) → reflection → soft
  closing line + invitation to comment ("ถ้าคืนนี้ยังนอนไม่หลับ…").
- `chapter` on the first segment of each part (the first is always at 0:00).

## Visuals

- Shared `image_style` (in `_template/episode.json`): cinematic night film still, wide 16:9.
- People from behind / far / out of focus; no readable text or logos.

## Publishing

- Playlists: TH `ตอนตีสอง · เรื่องเล่าก่อนนอน`, EN `2 A.M. Stories`. Same channel for now.
- Set video language + title/description language per video. Tick "Altered content".
- Paste `.chapters.txt` into the description.

## Production

`python tools/new_episode.py night-stories <slug> --mode story` → fill episode.json + script.md +
publish.md → `python tools/produce.py <episode>` (images → voice per language → render both).
`python tools/render_story.py <episode> --lang en` renders one language only.

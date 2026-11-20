# Series: work-talk (ใบเตยเล่างาน)

Part of the channel **ตอนตีสอง**: things about work you think about at 2 a.m. — burnout, bosses,
coworkers, salary, quitting, career doubts. Short podcast-style clips for Reels / TikTok / Shorts.

## Format spec

| Item | Value |
|------|-------|
| Aspect ratio | 9:16 vertical |
| Resolution | 1080x1920 |
| Max duration | 90 seconds (hard limit) |
| Target duration | 20–30 seconds |
| Language | Thai |

## Voice & host

- Same as love-quotes: ElevenLabs **Hammy** (`MYZYcGOqrkYQcwDunXl7`), `eleven_v3`, fallback edge-tts `th-TH-PremwadeeNeural`.
- Host ใบเตย — she is an office worker herself, so she speaks as a peer ("เราเองก็เคย..."), not as a coach.
- v3 audio tags (`[softly]`, `[sighs]`, `[warmly]`) in `text` only, at most one per segment.

## Tone

- Empathetic first, practical second: name the feeling, then give ONE small, doable takeaway.
- Honest, a little dry humour allowed (sighs about Monday, LINE from the boss at 11 p.m.).
- Never: get-rich promises, specific salary/legal/financial advice, naming or mocking real companies or people.

## Clip structure

1. **Hook** (0–3s) — a relatable pain line ("เคยไหม ทำงานหนักจนลืมว่าทำไปเพื่ออะไร")
2. **Insight** — why it happens / reframe, 1–2 segments
3. **Takeaway + CTA** (last 3–5s) — one small action + "เซฟไว้อ่านตอนเหนื่อย" / follow

## Visuals (image mode)

- Late-night office/home-office mood that fits ตอนตีสอง: desk lamp, laptop glow, empty office, city night, commute.
- People from behind or out of focus; no readable text on screens, no logos.

## Topic tracking

Same rules as love-quotes: read `catalog.md` (`python tools/catalog.py work-talk`, auto-run by
`produce.py`) and `ideas.md` before writing; tag episodes, log `posts` results.

## Production

Same pipeline as love-quotes (`series.md` there has the video-mode details):
`python tools/new_episode.py work-talk <slug>` → fill `episode.json` → `python tools/produce.py <episode>`.
Post with the platform's "AI-generated" label turned on.

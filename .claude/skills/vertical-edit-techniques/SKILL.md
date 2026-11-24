---
name: vertical-edit-techniques
description: Editing rules for 9:16 vertical short dramas / reels (hook in 1-3s, mobile framing + safe zones, emotion-driven shot choice, pacing with pauses before key lines, J/L-cuts, reaction shots, readable subtitles, clear sound mix, restrained transitions, cliffhanger ending, phone check before export). Use when planning shots/image prompts, building or reviewing episode.json segments, cards, music/sfx, render settings, or QA-ing a rendered vertical video in this repo.
---

# Vertical Edit Techniques (9:16)

Use together with `story-hook-framework` (that one = story/script; this one = shots, timing, sound, subtitles, export). The series' `series.md` wins on length, voice and tone (ตอนตีสอง = quiet, late-night, honest).

## The 11 rules → what to do in this pipeline

| # | Rule | Apply in this repo |
|---|---|---|
| 1 | **Hook in 1–3 s** — intriguing line, peak moment or shocked face first, then rewind | Segment 1 = peak image + hook line; tell the story after (`"แต่ก่อนหน้านั้น…"`). No intro, no fade-in. |
| 2 | **Frame for the phone** — face/key subject in the middle, never against top/bottom edge | In every `image_prompt`: "subject centered, face in the middle third, empty space top and bottom". Safe zone on 1080×1920: keep key things out of top ~250 px, bottom ~420 px, right ~150 px (app buttons, caption). Parallax dolly-in crops edges — keep faces away from them. |
| 3 | **Cut by emotion** — close-up for feelings, two-shot for exchanges, wide only when needed | Choose the shot per segment: close-up on emotional lines, two-shot/over-shoulder on dialogue, wide only to set place/time (usually once). Write it into `image_prompt` ("extreme close-up", "two-shot", "wide establishing"). Don't use wide twice in a row. |
| 4 | **Tight pacing** — cut silences and repeated words, but leave a short beat before the key line | Remove filler/repeats from `text`. Before the twist/key line put a short pause (split it into its own segment, or use a v3 tag like `[pause]` / "…" in the text). Long dead air → `"skip": true` or shorten text. |
| 5 | **J-cut / L-cut** — next line's audio starts before the picture, or audio lingers after the cut | Narration runs as one track, so let a line continue over the next image (L-cut) or start the next image's line slightly early (J-cut) by where you split segments: split images at mid-sentence breath points, not only at sentence ends. If a true audio/visual offset is needed, check `tools/render_reel.py` supports it before promising it. |
| 6 | **Show reactions** — after a key line, cut to the other person's face | After each key line, add a segment whose image is the listener's/other character's reaction (or the narrator's own face for monologue). Short (1–2 s) is enough. |
| 7 | **Readable subtitles** — short lines, big text, safe zone, highlight only key words | `cards` ≤ ~2 lines, ~12–18 Thai characters/line. Subtitles are already word-by-word gold highlight (`tools/subtitles.py`); don't add extra emphasis everywhere. Image mode = centered, video mode = lower third — both must stay inside the safe zone. |
| 8 | **Clear sound** — voice above music, low noise, SFX only at key moments | Music well under the voice (roughly −18 to −24 dB below; duck under speech). SFX from `shared/sfx/` only on hook, twist, or ending — 1–3 per clip max. Quiet late-night mood: soft room tone over busy music. |
| 9 | **Transitions sparingly** — hard cuts mostly; fade/effect only with a reason (time jump, memory, scene change) | Default = straight cut. Use a fade/dip only to mark flashback, time skip or new place, and say why in `script.md`. Never fade-in at the start. |
| 10 | **End on a cliffhanger or question** | Last segment leaves an open question / reversal (see `story-hook-framework` §4); `publish.md` caption ends in a question or points to the next part. |
| 11 | **Check on a phone before export** | After `render_reel.py`, review the mp4 at phone size: faces not cropped by parallax/punch-in, subtitles not touching edges or under app UI, voice clear over music, every image readable small. |

## Shot plan template (write in `script.md` before images)

```
| Seg | Time | Shot | Subject / emotion | Line (short) | Sound |
|---|---|---|---|---|---|
| 1 | 0–2s | CU | shocked face (peak) | hook | sfx hit |
| 2 | 2–5s | WS | room at 2 a.m. (rewind) | setup | room tone |
| 3 | 5–8s | 2-shot | conversation | … | — |
| 4 | 8–9s | CU reaction | other person's face | (no line / beat) | silence |
| … |
| N | last 3s | CU | unresolved look | open question | music out |
```

## Review / QA output

When reviewing an episode or a rendered video, give one row per rule with ✅/⚠️/❌, the segment number or timestamp, and a concrete fix (new `image_prompt` wording, split point, `skip`, music level…). End with a one-line verdict and the single most important fix. Only check what you can actually see: say so if you only have `episode.json` and not the rendered video.

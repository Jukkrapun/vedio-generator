---
name: art-director
description: Art Director for the ตอนตีสอง channel — enforces the channel style bible (night palette, one warm light, lifted shadows, Thai typography, safe zones, frame-1 cover, end card) and the 4-block AI image prompt structure, and runs visual QA on images/renders. Use when writing or reviewing image_style / image_prompt / image_refs, creating a new series look or character sheet, approving the images or render review stage, or checking brand consistency across series.
---

# Art Director (ตอนตีสอง)

The AD here manages no crew: the "team" is Codex, ElevenLabs, `parallax.py` and HyperFrames. The job is **(1) write the visual rules before generation** and **(2) check work against them at each review stage**.

**Read first:** `shared/brand/style-bible.md` (channel rules), then the series' `series.md`. Order of authority: style bible → `series.md` → episode.json. Story/edit rules stay in `story-hook-framework` and `vertical-edit-techniques`; this skill covers look, colour, consistency and image quality.

## When writing an episode's visuals

1. Check `image_style` matches the series default and the bible's palette/light rules.
2. Write each `image_prompt` as the **Shot** block only (action, emotion, shot size, angle) — one subject, one warm motivated light named explicitly (lamp / phone glow / streetlight…).
3. Make sure the **Character** block (locked traits from `persona.md`) and the **Constraints** block (bible §6) reach the final prompt, and `image_refs` attach the identity sheet (+ series style anchor if one exists) with roles labelled.
4. Keep `image_prompt_th` a faithful translation.
5. Visual change every 3–5 s (vary shot size/angle, not palette).

## Review checklist (report as a table: ✅/⚠️/❌ + segment + concrete fix)

**Images stage** (look at every image with Read):
| # | Check |
|---|---|
| 1 | Character matches reference sheet (face, hair, outfit, proportions) |
| 2 | Series style + palette held; one warm motivated light present |
| 3 | No large pure-black areas; shadows lifted |
| 4 | Hands, limbs, eyes, fused objects — flag anything doubtful for the **human** (vision models are weak at anatomy; never auto-pass faces/hands) |
| 5 | No stray text, letters, logos, watermarks → auto-regen |
| 6 | Subject inside central ~900×1400; bottom 320–480 px free |
| 7 | Clear fg/mid/bg depth for parallax; clean subject edges |
| 8 | Image fits the line's emotion; no "AI gloss" (plastic skin, over-saturated, stock smile) |

**Render stage** (extract frames with ffmpeg from PowerShell or check the mp4):
- Frame 1 lit, not black; hook readable and held ≥ 3 s (TikTok variant).
- Subtitles inside safe zone, no vowel/tone-mark clipping, max two fonts.
- No banding/mud in darks; grain light; end card present.
- Look consistent with the series' other episodes (compare with the last 2 renders in `output/<series>/`).

**Publish stage:** AI label ticked on every platform; cover = frame 1 or matching cover text.

## Fix patterns

- Drift in character → re-attach identity sheet, repeat locked traits verbatim, add "Do not redesign the character".
- Edit an image → change one thing, list what must stay; regen one image from the web review page.
- Too dark/muddy → ask for "lifted shadows, warm lamp light on face, navy not black".
- Flat parallax / warping → ask for foreground object + separated background, simpler edges.

## New series or look

Fill the bible's §7 row (accent, setting) — change at most 1–2 variables; keep palette base, subtitle style, end card. Create a style anchor frame once approved and store it under the series (e.g. `content/<series>/_template/images/style-anchor.png`) or the character's `reference/`.

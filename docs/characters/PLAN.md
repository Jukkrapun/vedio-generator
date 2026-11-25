# Character library + style knowledge — PLAN

Goal (user, 2026-11-25): every character is designed once (name, age, look, art style, voice, emotions), saved in `shared/characters/<name>/` and reused in any clip. The `art-director` skill uses the style research in `reports/` + `research_notes/` as knowledge, and may push back on a style that doesn't fit the content.

## Phase 1 — docs & skill (now)

- [x] `art-director` skill: style knowledge index (5 style reports), character workflow (reuse → else create → save), style push-back rule, image + voice prompt must state age / look / voice / emotion.
- [x] `shared/characters/_template/persona.md` → full character bible (Identity, Art style, Look locked, Character block EN+TH, Voice, Emotion range, reference/ checklist).
- [x] Fill `baitoey` and `somchun` with the new sections (keep existing content).
- [x] `shared/characters/README.md` = index of characters (who, style, voice, series).
- [x] CLAUDE.md pointer.

## Phase 2 — reference sheets ✅ done 2026-11-25

- [x] baitoey `reference/turnaround.png` + `expressions.png` (Codex, from `face-closeup.png`); somchun `reference/expressions.png` (`sheet.png` is already a turnaround).
- [x] Style anchor per series = `content/<series>/style-anchor.png`, picked from approved episode images (no Codex cost): love-quotes 019 hook (caricature cartoon), work-talk 012 hook (semi-real anime), living-life 002 hook (photoreal still-life), night-stories 005 moon-house (storybook), poc/cat-2am 001 two-lights (2D hand-painted).
- Attach as 2nd ref: `image_refs` = [character sheet, style anchor], roles labelled. Replace an anchor when the user approves a new series look.

## Phase 3 — tooling (later, optional)

- `episode.json` → `"characters": ["somchun"]`; `images.py` reads each persona's Character block + `reference/` automatically (replaces hand-copied `image_style` text / `image_refs`).
- `tts.py` takes voice/model/voice_settings from the narrator's persona when the episode doesn't set them.
- Voice test helper: render one sample line per emotion to `shared/characters/<name>/voice-samples/` before a voice is saved.

## Rules

- Never copy real people or existing famous characters; `_inspiration/` = general traits only.
- Keep the cast small (≈5–8 recurring characters); reuse before creating.
- A voice_id is saved only after a real API test (some library voices return 400 "not fine-tuned").

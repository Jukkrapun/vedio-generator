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

## Phase 3 — tooling ✅ done 2026-11-25

- [x] `shared/characters/<name>/character.json` = machine side of persona.md (`image_block`, `refs`, `voice`, `samples`); `tools/characters.py` loads it.
- [x] `images.py`: `"characters": [...]` appends each `image_block` to the shared style and attaches its `refs`; `"style_anchor": true` (or a path) attaches `content/<series>/style-anchor.png`; every attached image is labelled by role in the Codex prompt. Old `image_refs` still work.
- [x] `tts.py` (`synthesize_segments`, also used by `render_story.py`): `"narrator": "<name>"` fills tts/voice/model/rate/voice_settings/fallback when the episode doesn't set them. Explicit keys win, so existing episodes and their TTS caches are unchanged.
- [x] `tools/voice_samples.py <name> [--voice --model]` → `voice-samples/<emotion>.mp3` from `samples` (costs ElevenLabs credits).
- [x] Series templates: `"style_anchor": true` in love-quotes, work-talk, living-life, night-stories, poc/cat-2am; cat-2am also `"characters": ["somchun"]` + `"narrator": "somchun"` (replaces `image_refs`). Existing episodes unchanged.
- [x] Web page `/characters` (menu "ตัวละคร"): reference images, voice samples, episodes that use each character, persona.md; edits `image_block`, voice id/model and sample lines in `character.json` (`web/lib/characters.ts`, `PATCH /api/characters/<name>`). docker-compose mounts `./shared` into the web container.

## Rules

- Never copy real people or existing famous characters; `_inspiration/` = general traits only.
- Keep the cast small (≈5–8 recurring characters); reuse before creating.
- A voice_id is saved only after a real API test (some library voices return 400 "not fine-tuned").

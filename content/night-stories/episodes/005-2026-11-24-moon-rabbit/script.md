---
title: กระต่ายผู้ดูแลดวงจันทร์ / The Rabbit Who Looks After the Moon
status: draft        # draft | ready | rendered | published
duration_target: 540 # seconds (~4.4k TH chars + 71 x 1.0s pauses = about 8.5-9 min)
publish_date:
---

## Logline (TH / EN)

TH: นวล กระต่ายขาวบนดวงจันทร์ ตัดแสงจันทร์ทีละชิ้นส่งลงไปให้คนที่นอนไม่หลับ ดวงจันทร์จึงบางลงทุกคืน
จนคืนหนึ่งมันมืดสนิท แล้วทั้งเมืองข้างล่างก็เปิดไฟส่งขึ้นมาให้เธอ
EN: Nual, a little white rabbit on the moon, snips off pieces of moonlight for people who can't sleep.
That's why the moon wanes. One night it goes dark, and the whole town below lights up for her.

## Format

Bedtime story (series.md). It is the series' first **fairy tale**: the topic came from the user on 2026-11-24.
Thai moon-rabbit folklore is only the starting point; Nual, the owl and the plot are original.
Images use `image_rules` for a painted storybook look (not photorealistic), and the rabbit is described
the same way in `image_style` and in every prompt so she stays consistent. If she still drifts between
images, make a character sheet and add it as `image_refs`, the same way cat-2am does.

## Parts / chapters

1. กระต่ายบนดวงจันทร์ / The Rabbit on the Moon (s01–s07): hook, open loop ("one night the moon went dark"), her house
2. งานของนวล / Nual's Work (s08–s16): sweep stardust, polish, lantern round
3. แสงจันทร์ชิ้นเล็ก ๆ / Little Pieces of Moonlight (s17–s36): lit windows, the old man / nurse / student, snipping moonlight, why the moon wanes
4. คืนที่ดวงจันทร์มืด / The Night the Moon Went Dark (s37–s45): the owl, the last piece, dark and tired
5. แสงจากข้างล่าง / Light from Below (s46–s62): child with the flashlight, the same three people light up, the town glows, she sleeps
6. เสี้ยวใหม่ / A New Crescent (s63–s66): the moon regrows from returned light
7. ก่อนหลับ / Before You Sleep (s67–s71): lullaby

## Story-hook-framework review (bedtime rules from series.md)

| Rule | Status | Where | Notes |
|---|---|---|---|
| 1.5s hook | ✅ | s01 | "รู้ไหม… ทุกคืนที่เธอมองดวงจันทร์ มีใครบางคนกำลังมองกลับมา" over the rabbit seen from behind on the moon edge. No greeting. |
| Open loop (3s) | ✅ | s03 | Unfinished statement: "มีอยู่คืนหนึ่ง… ที่ดวงจันทร์มืดสนิท และนวลไม่มีแสงเหลืออยู่เลย". Closed in s41–s62. A second small loop, *why does the moon wane?*, is answered in s33. |
| Pattern interrupt | ⚠️ by design | 20 images, ~26 s each | The series uses 1 image per 20–40 s. Framing alternates between wide (moon, town), close-up (polishing, pillow, paw) and the earth view. |
| Climax (soft Kishōtenketsu) | ✅ | Ten s46–s58 (~70–80%) | Ki = her work, Shō = giving moonlight away until it runs out, **Ten** = the people she helped send the light back, so the caretaker is cared for, Ketsu = new crescent + "ความใจดี มันวนกลับมาเสมอ". Setup/payoff: the old man, the nurse and the student appear in s21–s23 and return in s50. |

## Edit notes

| Rule | Decision |
|---|---|
| Framing | Humans only from behind or as silhouettes. Rabbit centered. Bottom 20% kept calm for subtitles (in `image_rules`). |
| Shot by emotion | Close-ups on s58 (light in her paw) and s10 (moonlight on the pillow). Wides for the moon house, the town and the glowing town. |
| Pause before key line | s57 "นวลเพิ่งเข้าใจ…" is its own short segment before the realisation. s41 "คืนนั้น… ดวงจันทร์มืดสนิท" also stands alone. |
| Sound | No music yet. Soft chime / ambience would fit; nothing in `shared/sfx/` yet. |
| Ending | Lullaby; the comment invitation is in the description only. |

## Review fixes (2026-11-24, both skills)

- Hook: dropped "รู้ไหม…"; the open loop ("the night the moon went dark") is now line 2.
- Cut the line that gave the twist away ("ไม่มีใครส่งแสงขึ้นมาให้ฉัน"); the owl no longer states the moral.
- Old man / nurse / student get their own images (07b–d), reused when they light up for Nual.
- Close-ups added: 13b (tired, in the dark) and 15b (reaction to the child's flashlight).
- `render_story.py`: the first shot no longer fades in.
- Still open: soft ambient bed (about −24 dB) once a file exists in `shared/music/`.

## Notes on the English rewrite

Natural rewrite. "นวล" kept as Nual. "หลับฝันดีนะ" = "Sleep well."

## Image list (16:9)

25 images (01 … 20 plus 07b old man, 07c nurse, 07d student, 13b tired close-up, 15b Nual sees the light), prompts in episode.json.

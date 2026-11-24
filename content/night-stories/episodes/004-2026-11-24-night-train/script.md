---
title: รถไฟกลางคืน / The Night Train
status: draft        # draft | ready | rendered | published
duration_target: 540 # seconds (~3.8k TH chars + 64 x 1.0s pauses = about 8-9 min)
publish_date:
---

## Logline (TH / EN)

TH: ผู้หญิงที่นอนไม่หลับมาหลายเดือน ซื้อตั๋วรถไฟนอนขึ้นเหนือโดยไม่มีธุระอะไร แล้วได้หลับสนิทครั้งแรก
เพราะได้รู้ว่าบนรถไฟ มีคนตื่นอยู่แทนเธอเสมอ
EN: A woman who hasn't slept in months takes the night train north for no reason, and finally sleeps,
because on a train there is always someone awake for you.

## Format: bedtime story (new direction, user 2026-11-24)

The series used to run on small mysteries. This one is a **sleep story**: no strong twist, lots of
sense detail (sound, smell, light), the pace slows in the second half, and it ends on a lullaby
("หลับฝันดีนะ") instead of asking for comments. The comment invitation moves to the description.

## Parts / chapters

1. คืนที่ฉันหลับ / The Night I Slept (s01–s10): result first, then the station at 21:30 and the train
2. เตียงชั้นบน / The Upper Berth (s11–s17): the attendant makes the beds, curtain, the train starts
3. สถานีเล็ก ๆ / Small Stations (s18–s32): city lights fade, stationmaster with the lantern, moon, the old woman knitting
4. คนที่ไม่ได้นอน / The One Who Stays Awake (s33–s48): night lights, the attendant's rounds, the blanket, the realisation, tunnel, sleep
5. หมอกตอนเช้า / Morning Mist (s49–s57): dawn mountains, coffee, the finished scarf, arrival, takeaway
6. ก่อนหลับ / Before You Sleep (s58–s64): lullaby to the listener

## Story-hook-framework review (adapted to bedtime long-form)

`series.md` and the bedtime brief win over the shorts rules: the "hook" has to be calm and the
"twist" is a gentle reframe, not a shock.

| Rule | Status | Where | Notes / decision |
|---|---|---|---|
| 1.5s hook | ✅ | s01 | Starts on the peak image (her asleep in the berth) + "คืนนั้น… เป็นคืนแรกในรอบหลายเดือน ที่ฉันหลับสนิท". No greeting, no channel intro. |
| Open loop (3s) | ✅ | s01–s03 | Result first, then rewind: *why* could she sleep on a rocking train and not at home? This loop is closed in s47–s48 ("ไม่มีใครตื่นอยู่แทนฉันเลย"). s03 invites the listener aboard. |
| Pattern interrupt | ⚠️ by design | 17 images, ~30s each | The shorts rule (3–5s) is too fast for a sleep story and goes against series.md (1 image per 20–40s). Changes come from the parallax drift plus a framing change at each new image: wide → detail → close-up → landscape. Wide shots are never back to back except 07→08, where they change from station to moon. |
| Climax (Kishōtenketsu) | ✅ soft | Ten at s46–s48 (~72%) | Ki = station and berth, Shō = small stations and the old woman, **Ten** = the attendant's rounds reframe her insomnia ("ไม่ใช่เพราะเสียงดัง… แต่เพราะไม่มีใครตื่นอยู่แทนฉัน"), Ketsu = dawn and arrival ("โลกมีคนตื่นอยู่เสมอ… เพื่อให้คนอื่นได้หลับ"). The ending is deliberately NOT a cliffhanger: it closes with a lullaby. |

## Edit notes (vertical-edit-techniques, applied to 16:9)

| Rule | Decision |
|---|---|
| Framing | 16:9, people from behind or blurred, no faces. Keep subjects away from the edges because the parallax dolly crops them. |
| Shot by emotion | Close-ups on the emotional beats: 05 the berth, 12 the hand pulling up the blanket (the Ten). Wides only for place and time (02, 08, 14, 16). |
| Pause before key line | s45 "ฉันนอนมองเพดานแล้วคิด…" is its own short segment, so there is a beat before the realisation. `pause_sec` is 1.0 (was 0.8) for a slower bedtime pace. |
| Reaction | s50 (her lying still), s54 (her nod) follow the key lines. |
| Sound | Voice only for now (`music: null`). A loop of soft train-wheel ambience at about −24 dB would fit this one; nothing in `shared/sfx/` yet. "กึก… กัก…" in the text acts as the sound motif instead. |
| Transitions | Hard cuts. A fade is only justified at s49 (time skip to dawn) if the renderer supports it. |
| Ending | Lullaby, not a cliffhanger: this is intended for the bedtime format. |
| Phone check | After render, check on a phone that subtitles in the long 2-line segments (s11, s39, s52) don't wrap into 3 lines. |

## Notes on the English rewrite

- Natural rewrite. "กึก… กัก…" = "clack… clack…". The grandmother calls her "dear".
- No place names except the old woman mentioning Chiang Mai in TH; EN keeps it vague ("by the time we arrive").

## Image list (16:9)

17 images (01-berth-sleeping … 17-rain-window-sleep), prompts in episode.json. Attendant, stationmaster
and old woman are only seen from behind, far, or out of focus.

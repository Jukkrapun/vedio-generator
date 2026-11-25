---
title: คลื่นตีสอง ตอนที่ 1: คืนแรก / 2 A.M. Radio, Night 1: The First Night
status: draft        # draft | ready | rendered | published
duration_target: 480 # seconds (~4.1k TH chars + 69 x 1.0s pauses = about 7.8-8 min)
publish_date:
---

## Logline (TH / EN)

TH: ผู้หญิงที่นอนไม่หลับมาหลายปีรับจัดรายการวิทยุช่วงตีสองที่ไม่มีใครอยากจัด คืนแรกพูดกับความเงียบอยู่หลายชั่วโมง
จนตีสามสี่สิบ มีข้อความเดียวเข้ามาจาก "ผู้ฟังหน้าต่างชั้นเจ็ด" ตึกฝั่งตรงข้าม
EN: A woman who hasn't slept in years takes the 2 a.m. radio slot nobody wants. On her first night she talks
to silence for hours, until 3:40, when one message comes from "the listener in the seventh-floor window".

Season plan and rules: `content/night-stories/radio-2am.md` (episode 1 of 6).

## Parts / chapters

1. ไฟสีแดง / The Red Light (s01–s04): hook, open loop, show intro
2. ทำไมต้องตีสอง / Why Two A.M. (s05–s14): the station, her insomnia, signing up for the slot
3. ห้องชั้นบนสุด / The Room at the Top (s15–s21): studio, coffee, the lit seventh-floor window (setup)
4. พูดกับความเงียบ / Talking to the Quiet (s22–s37): first words, weather, silent phone, a record, the sleeping city
5. ไม่มีใครฟังหรอก / Nobody's Listening (s38–s42): doubt
6. ข้อความเดียว / One Message (s43–s54): the message, the blinking light, the reframe
7. ไฟที่ดับลง / The Light Goes Out (s55–s64): her reply on air, the light goes off, dawn, open thread
8. คลื่นตีสองขอตัวลา / Signing Off (s65–s69): fixed sign-off + lullaby

## Story-hook-framework review

| Rule | Status | Where | Notes |
|---|---|---|---|
| 1.5s hook | ✅ | s01 | "ตีสองตรง / ไฟสีแดงเหนือประตูก็สว่างขึ้น": short, concrete, one strong image (red lamp close-up). It is also the fixed opening for every episode. |
| Open loop (3s) | ✅ | s02 | Unfinished statement: "คืนแรก… มีข้อความเข้ามาแค่ข้อความเดียว และมันเปลี่ยนเหตุผลที่ฉันอยู่ตรงนี้". Closed in s43–s54. |
| Pattern interrupt | ⚠️ by design | 22 images, ~22 s each | Series rule (20–40 s per image). Framing alternates between wide (building, city, studio), close-up (lamp, fader, vinyl, clock) and POV (window). |
| Climax | ✅ | Ten s43–s54 (~62–78%) | Ki = insomnia and the empty slot, Shō = talking to silence and doubt, **Ten** = the message reframes her insomnia as company for someone else ("การนอนไม่หลับของฉัน มีประโยชน์กับใครสักคน"), Ketsu = the light goes off, she sleeps at dawn. Setup/payoff: the seventh-floor window in s19–s21 returns in s46. |
| Serial thread (B, softened) | ✅ | s64 | Gentle open question instead of a cliffhanger: "ยังไม่รู้ว่าผู้ฟังหน้าต่างชั้นเจ็ดเป็นใคร… แต่ทุกคืน ไฟห้องนั้นก็ยังเปิดรอฉันอยู่". Fits the bedtime ending. |

## Vertical-edit review (adapted to 16:9 long-form)

| Rule | Status | Notes |
|---|---|---|
| Hook image | ✅ | 01 red lamp close-up, readable at a glance; first shot no longer fades in (`render_story.py`). |
| Shot by emotion | ✅ | Close-ups on emotional beats: 14 (doubt, side profile in shadow), 19 (faint smile in red light). Wides only for place: 03, 06, 12. |
| Pause before key line | ✅ | s43 "แล้วตอนตีสามสี่สิบ…" and s52 "ฉันยืนอยู่ตรงนั้นนานมาก" are short standalone segments. |
| Reaction | ✅ | 18 (window blinks) → 19 (her face). |
| Subtitles | ⚠️ | s42 has 3 lines; it will split into short lines. Check on render. |
| Sound | ⚠️ | No music yet. A real radio feel would benefit from a soft vinyl-crackle / room-tone bed (−24 dB); none in `shared/music/` yet. |
| Ending | ✅ | Fixed sign-off + lullaby. |

## Images

22 images, each with `image_prompt` (EN, sent to Codex) and `image_prompt_th` (for review in the web).
Studio images (02, 06, 07, 08, 09, 10, 11, 22) are meant to be reused in later episodes.
No readable text anywhere: on-air lamp is a plain red light, clock face has no numbers, the message is blurred.

## Notes on the English rewrite

Natural rewrite. "คลื่นตีสอง" = "2 A.M. Radio". The DJ is unnamed; the listener's gender is not given ("they").

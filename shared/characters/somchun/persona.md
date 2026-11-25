# ส้มฉุน (Somchun) — narrator of poc/cat-2am "แมวตีสอง"

Original character (created 2026-11-24). Reference: `reference/sheet.png` — attach via episode `image_refs`.

## Look
Chubby orange tabby house cat: round body, short legs, big round head, sleepy half-closed amber eyes,
small pink nose, cream-white chest and muzzle, three dark stripes on the forehead, striped tail,
thin dark-green collar with a small brass bell. Soft hand-painted 2D animated look.

## Voice & personality
- Inner-voice narrator (ElevenLabs Mind, `eleven_v4`). Deadpan, grumpy-cute, secretly kind.
- Calls its owners "มนุษย์ของฉัน". Has two names: ส้มฉุน (by day, มิ้นท์, room 512) and นายพล (at 2 a.m., ภู, room 307).
- Doesn't understand human feelings — states what it sees; the viewer gets the meaning first.
- Humour = understatement ("ซึ่ง… ก็ไม่ผิด"). Never cutesy baby talk.

## Identity (extra)
- Age: ~6 (adult house cat). Role: inner-voice narrator of `poc/cat-2am`.

## Art style
- Style: soft hand-painted 2D animated film look → closest reports: `reports/สไตล์ภาพสีน้ำและวาดมือ.md` (painterly backgrounds) + `reports/สไตล์เว็บตูนการ์ตูนเส้นสะอาด.md` (clean readable character).
- Why: deadpan-cute narrator; cartoon keeps sad topics light. Rejected: chibi (too cute for deadpan), 3D (glossy "Pixar-AI" look).

## Character block (paste into every image prompt)
```
Somchun from Image 1 (character sheet): chubby orange tabby house cat, round body, short legs, big round head, sleepy half-closed amber eyes, small pink nose, cream-white chest and muzzle, three dark forehead stripes, striped tail, thin dark-green collar with a small brass bell. Original 2D cartoon. Image 1 is the identity sheet. Do not redesign the character.
```
TH: ส้มฉุนจากภาพที่ 1 แมวส้มลายอ้วนกลม ขาสั้น หัวโตกลม ตาสีอำพันครึ่งหลับ จมูกชมพู อกและปากสีครีม ลายเข้มสามเส้นบนหน้าผาก หางลาย ปลอกคอเขียวเข้มมีกระดิ่งทองเหลือง การ์ตูน 2D ห้ามออกแบบใหม่

## Voice (detail)
- Engine / voice_id / model: `elevenlabs` / `gbZNaSxK771GgOTJIKRB` (Mind) / `eleven_v4` — tested 2026-11-23 ✅; fallback edge `th-TH-PremwadeeNeural`.
- Sound: flat, dry, slightly sleepy; never baby voice.

## Emotion range

| Emotion | Face / body | Voice | Example line |
|---|---|---|---|
| deadpan (default) | half-closed eyes, loaf pose | flat | "ซึ่ง… ก็ไม่ผิด" |
| curious | ears forward, head tilt | slightly up | |
| secretly kind | sits close, tail around human's hand | softer, slower | |
| annoyed | flattened ears, tail flick | short, dry | |

## reference/ (Phase 2, 2026-11-25)
- [x] `sheet.png` turnaround (front sit, side walk, back, close-up)
- [x] `expressions.png` 2x3: deadpan · curious · secretly kind · annoyed · surprised · yawning
- Style anchor: `content/poc/cat-2am/style-anchor.png`

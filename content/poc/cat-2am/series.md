# Series: poc/cat-2am (แมวตีสอง) — POC, never posted

Episodic cartoon story narrated by an orange cat. Proof of concept for (1) a continuing story
format, (2) a cartoon look with one consistent character, (3) later: Wan image-to-video motion
(`docs/motion-video/PLAN.md`). Part of `content/poc/` → kept out of the posting queue.

## Season 1 — "แมวสองชื่อ" (8 episodes)

By day the cat lives with **มิ้นท์** (room 512) who calls it **ส้มฉุน**. Every night at 2 a.m. it slips
across to the next building to **ภู** (room 307) who calls it **นายพล**. Both humans can't sleep and
each thinks the cat is theirs. Season loop: *what happens when they find out?*

| # | Title | Reversal at the end |
|---|---|---|
| 1 | สองชื่อ | ภู ties a note to the collar: "ถึงเจ้าของแมว" |
| 2 | โน้ตใบแรก | ภู: "ผมรู้ว่าคุณนอนไม่หลับ ไฟห้องคุณเปิดทุกคืน" |
| 3 | ไฟห้องตรงข้าม | latest note: "สัปดาห์หน้าผมจะย้ายออก" |
| 4 | แมวหาย | the cat hides on purpose; both search; they meet face to face at 2 a.m. in the rain |
| 5 | คนที่รู้จัก | ภู is the guard มิ้นท์ got fired; "ผมรู้ตั้งแต่โน้ตใบแรกแล้ว ว่าเป็นคุณ" |
| 6 | เหตุผลที่ย้าย | ภู lost his job that day; มิ้นท์'s unsent note — the cat runs off with it |
| 7 | ตีสองคืนสุดท้าย | the cat delivers the note but ภู's room is already empty |
| 8 | ชื่อที่สาม | มิ้นท์ got him his job back at HER building; they name the cat "ส้มพล" together |

Continuity: ep3 plants that ภู has no work ("ช่วงนี้ไม่มีงานทำ") → paid off in ep5–6.

## Format

| Item | Value |
|---|---|
| Aspect | 9:16, 1080x1920, image mode (parallax; Wan motion later) |
| Length | 30–40 s, 8–9 segments, ≤ 5 s each |
| Language | Thai |
| Narrator | the cat, inner voice: deadpan, grumpy-cute, secretly kind; never explains feelings it can't understand — the viewer gets it first |

Writing rules: follow `.claude/skills/story-hook-framework` → **B. Serial Reversal**: seg 1 = strongest line
(≤ ~1.5 s) + close-up; open loop by 3 s; new image every 3–5 s with alternating framing (close-up / wide /
detail / hands); last 3–5 s = reversal that is NOT resolved; caption points to the next part.

## Voice

ElevenLabs **Mind** `gbZNaSxK771GgOTJIKRB`, `eleven_v4` (picked in poc/sound 004). Fallback edge Premwadee.
No v3 tags; pauses with "…".

## Visuals

- `image_refs`: `shared/characters/somchun/reference/sheet.png` (attached to every Codex run).
- `image_rules`: original 2D cartoon illustration, not photorealistic; **humans never show their faces**
  (hands, backs, silhouettes, feet only); no readable text — note contents go in `cards` instead.
- Recurring places: Mint's warm cozy room 512 (plants, fairy lights), Phu's messy dim room 307 (boxes,
  single desk lamp), the gap/ledge between the two buildings, the city at 2 a.m.

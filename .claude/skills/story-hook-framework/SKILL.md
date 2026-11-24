---
name: story-hook-framework
description: Retention framework for short-form scripts and stories (1.5s visual hook, open loop in 3s, pattern interrupt every 3-5s, climax as Kishōtenketsu twist or serial reversal). Use when writing, analyzing, reviewing or rewriting any episode script, storyboard, hook, or long-form story in this repo (love-quotes, work-talk, living-life, night-stories, etc.).
---

# Story Hook Framework

Apply these 4 rules whenever you **write** a new episode (`episode.json` segments + `script.md`) or **analyze/review** an existing one. They sit on top of the series' own `series.md` — the series spec wins on length, voice and tone (ตอนตีสอง = quiet, late-night, honest). "High attention" here means *emotionally sharp*, not loud or clickbait.

## 1. The 1.5-Second Visual Hook
- Segment 1 starts on the strongest image + strongest line. No fade-in, no greeting, no "สวัสดี/วันนี้จะมาเล่า", no channel intro.
- First spoken line ≤ ~1.5 s (roughly ≤ 8–10 Thai words). Lead with the painful/specific thing, not context.
- The first image must be readable at a glance (one subject, clear emotion, high contrast in dim light).
- ✗ "ช่วงนี้หลายคนคงรู้สึกเหนื่อยกับงาน…" → ✓ "ลาออกไม่ได้ เพราะไม่รู้จะไปไหน"

## 2. The Open Loop Premise (within 3 s)
By ~3 s the viewer must know *what they get if they stay to the end*. Pick one:
- **Question** they need answered: "ทำไมคนที่ใจดีที่สุด ถึงชอบอยู่คนเดียว"
- **Result first, then rewind**: show the ending/conclusion, then "แต่ก่อนหน้านั้น…"
- **Promise / count**: "สามสัญญาณว่าเขาไม่ได้รักเราแล้ว — ข้อสุดท้ายเจ็บสุด"
- **Unfinished statement**: "คืนนั้นเขาพูดประโยคเดียว ที่ทำให้ฉันเลิกรอ"
The loop must be **closed** in the climax — never bait without payoff.

## 3. The 3-Second Rule (Pattern Interrupt)
Plan a visual/audio change every **3–5 s**. In this pipeline that means:
- **image mode**: a new segment `image` every 3–5 s (parallax motion alone is not a change); alternate framing (wide → close-up → detail/object → face) in `image_prompt`.
- **video mode**: host punch-in alternates wide/1.18x automatically — still cut to `"visual": "image"` B-roll every 2–3 host segments.
- On-screen `cards`: a short pop-up/key phrase on the turning lines.
- Optional SFX/music hit on the turn (from `shared/sfx/`).
- Check: total duration ÷ number of segments should be ≤ 5 s. If a segment's line runs > 5 s, split it.

## 4. The Climax (Ten / Reversal)
Choose by format:

**A. Standalone short (Japanese Kishōtenketsu)** — default for all shorts series:
| Part | Role | Share of runtime |
|---|---|---|
| Ki (起) | Set up an ordinary, relatable situation | ~25% |
| Shō (承) | Develop it — details the viewer recognises in themselves | ~35% |
| **Ten (転)** | **Twist** — reframe, flip perspective, the unexpected truth | ~25% |
| Ketsu (結) | Reconcile — quiet takeaway that makes the twist land | ~15% |
The twist lands in the final 20–30%. It reframes, it doesn't need conflict (e.g. "ที่จริงคนที่เราไม่ยอมปล่อย ไม่ใช่เขา… แต่เป็นตัวเราในตอนนั้น").

**B. Episodic series (Korean Serial Reversal)** — for part 1/2 remakes and night-stories chapters:
- End each episode on a reversal that squeezes emotion: a revealed secret, a reversed power position, a decision cut off mid-moment.
- Don't resolve it — the last line/frame raises a new question; title the next one "ตอน 2".
- Put the cliff in the final 3–5 s; `publish.md` caption should point to the next part.

## Workflow

**Writing:** hook line → open loop → Ki/Shō beats (one beat per 3–5 s segment) → Ten/reversal → Ketsu → then image prompts with alternating framing → `cards` on hook + twist → `publish.md` (cover text = the hook).

**Analyzing/reviewing:** output a table, one row per rule, with ✅/⚠️/❌, the timestamp or segment number, and a concrete rewrite for anything not ✅:

```
| Rule | Status | Where | Issue | Fix |
|---|---|---|---|---|
| 1.5s hook | ⚠️ | seg 1 | opens with context | start with "…" |
| Open loop (3s) | … |
| Pattern interrupt | … | avg 6.2 s/seg | split seg 3, 5 |
| Climax | … | Ten at 82% | … |
```
Then give a 1-line verdict and the top fix. Use the timeline (`audio/timeline.json`) or segment durations when available; otherwise estimate ~3–4 Thai words/s (adjust for `voice_settings.speed`).

When post results exist (`episode.json` → `posts`), relate weak completion rate (<~30%) to rules 1–2 first, and low shares/saves to rule 4.

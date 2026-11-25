# ตอนตีสอง — Style Bible (channel level)

Sits above every series. Order of authority: **this file → series `series.md` → episode.json**.
A series may change only what the "Per-series variables" table allows. Source: `reports/Art Director ตอนตีสอง.md` (2026-11-25).
Values marked *(proposal)* are starting points — confirm on a phone and adjust after the 2-week test (~2026-12-06).

## 1. Channel constants (never change per series)

| Item | Rule |
|---|---|
| Mood | Quiet, late-night, honest. Not loud, not glossy, no stock-photo smiles. |
| Light | **One warm, motivated light source in every frame** (bedside lamp, phone glow from below, fridge light, amber streetlight, convenience-store sign) against cool blue night. Face or hands of the subject sit in that light. |
| Darks | Lift shadows slightly. **No large pure-black areas** — platform compression turns them into banding/mud. Feel dark, don't be dark. |
| Texture | Light film grain (hides banding); soft vignette OK. Teal-orange grade only subtle. |
| Subtitles | IBM Plex Sans Thai SemiBold, white + black outline + soft shadow, no box, spoken word gold. |
| End card | "ตอนตีสอง" end card (HyperFrames overlay) on every short. |
| Playlist | `ตอนตีสอง · เรื่อง<topic>` |
| Motion | Slow parallax (default), hard cuts by default, no flashy transitions. |
| AI label | Always tick the platform AI label (voice is AI → required on Meta/TikTok). Never strip C2PA metadata. |

## 2. Palette *(proposal, hex)*

| Role | Hex | Share |
|---|---|---|
| Night base (navy/indigo, not black) | `#141B2D` – `#1E2A44` | ~70% |
| Teal (cool fill, windows, city) | `#2F5D6B` | ~15% |
| Warm light | `#F2A65A` / `#FFC98B` | ~15% |
| Gold accent (= subtitle highlight) | `#E8C170` | accents only |

## 3. Typography

- Max **two families** per clip.
- Subtitles: IBM Plex Sans Thai SemiBold (loopless — verify the "looped" claim before changing anything).
- Hook / cover / frame-1 text only: **Kanit SemiBold** (`shared/fonts/Kanit-SemiBold.ttf`).
- Line height 1.3–1.5× so stacked vowels/tone marks (ั ิ ่ ้) never collide. *(proposal sizes @1080 wide)* hook 90–120 px, 2–3 lines, 8–14 chars/line; subtitles 60–72 px, 1–2 lines.
- Busy background → local darkening/vignette behind text, never a box.

## 4. Framing & safe zones (9:16, 1080×1920)

Same clip goes to TikTok, Reels and Shorts → use the most cautious numbers:
- Subject and key text inside the **central ~900×1400 box**.
- Margins: top 108, left 60, right 120, **bottom 320–480 px** (UI + caption). `lower` subtitles stay above y≈1600.
- One subject per frame, readable at a glance.

## 5. Frame 1 = cover

- Never fade in from black. Frame 1 is already lit, warm source visible.
- One-line Thai hook, upper-middle, held ≥ 3 s (`--tiktok` variant).
- Optional channel motif ("02:00") always in the same corner.

## 6. AI image prompt structure (4 blocks)

| Block | Lives in | Contains |
|---|---|---|
| Style | `image_style` (default from `series.md`) | medium, palette, the one warm light, grain, lens feel |
| Character | fixed text from `persona.md` + `image_refs` | locked traits; "Image 1 = identity sheet. Do not redesign the character." |
| Shot | `image_prompt` / `image_prompt_th` | action, emotion, shot size, camera angle |
| Constraints | shared block (below) | format, safe zone, depth, no text |

Shared constraints block (append to every prompt):

```
Vertical 9:16. Main subject inside the central 60% of the frame, nothing important in the bottom 25%.
Clear foreground / midground / background separation for depth parallax; clean subject edges.
One warm motivated light source against cool blue night; lifted shadows, no large pure-black areas; subtle film grain.
No text, letters, logos, watermarks or signatures anywhere.
```

- Label every attached image by role (identity sheet / style anchor / background).
- **Style anchor:** one approved frame per series, attached as the 2nd reference.
- Edits: change one thing, list what must stay the same. Never rely on "same style as before".
- No seed control in Codex → consistency = references + locked text.
- Characters: keep turnaround (front/side/back) + expression sheets in `shared/characters/<name>/reference/`.

## 7. Per-series variables (only these may differ)

| Series | Accent / light | Setting | Notes |
|---|---|---|---|
| love-quotes | rose / amber warmth | close shots, bedroom, phone glow | |
| work-talk | cool monitor / office neon at night | empty office, desk, commute | warm source still present (desk lamp, screen) |
| living-life | muted neutral | empty room, window, kitchen at night | |
| night-stories | storybook warmth | 16:9, chapter cards | long-form, `render_story.py` |
| poc/cat-2am | 2D cartoon (`image_rules`) | ส้มฉุน's world | **keeps** night palette + end card |

## 8. Never

Bright saturated colours · daylight scenes (unless the story demands, then dim) · stock smiles · flashy transitions/zoom-whooshes · text baked into images · pure black frames · more than two fonts · faces/hands left unchecked by a human · photos of real people sent to Codex.

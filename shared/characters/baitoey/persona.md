# Host: ใบเตย (Baitoey)

Fictional AI-generated person. Must not resemble any real person or celebrity.
Style inspired by general traits only (hair/makeup/vibe) — no real-person photo was ever sent to an image model.

## Identity
- On-screen persona: ใบเตย — guest on a talk-show sofa who shares quotes, short stories, attitudes and life lessons
- Age look: 27–29
- Vibe: warm, thoughtful, sincere, cool modern office woman; speaks like a wise older sister/friend
- Default voice: ElevenLabs `MYZYcGOqrkYQcwDunXl7` (Hammy — Warm & friendly, calm Thai female), model `eleven_v3`

## Look (keep identical in every image)
- Face: see `reference/face-closeup.png` (identity source for Codex `--image`)
- Glasses: slim gold metal oval frames — always
- Hair: glossy black, high messy bun with soft face-framing strands
- Makeup: fair skin, soft rosy blush, natural rose lips
- Outfit: tailored blazer (black / camel / slate-blue) over a simple top
- Mic: small black lavalier clipped on the lapel — no big mic in frame

## Looks (`looks/`) — used by new episodes
Outfit + background chosen per episode to match its content; see `looks/README.md`.
Current: `talk-show-leather` (default, has base.mp4), `velvet-evening` (sad/deep), `boucle-cozy` (gentle/self-love).
`scenes/` + `base/` below are kept for older episodes.

## Scenes (`scenes/`, 1080x1920 ready for lip-sync upload; 1024x1536 sources in `scenes/original/`)

| File | Mood | Use for |
|------|------|---------|
| `01-leather-sofa.png` | talk-show set, warm wood slats, studio light | **default** — most episodes |
| `02-velvet-sofa-evening.png` | dark green velvet, evening lamps, tea | deep / sad / heartbreak topics |
| `03-boucle-sofa-cozy.png` | cream sofa, bookshelf, fairy lights | gentle / comforting / self-love |

## Base talking videos (`base/`)
Real lip-synced talking footage, reusable as the input video for video-to-video lip-sync (Sync lipsync-2 on fal) so new episodes don't need expensive image-to-video lip-sync.

| File | Source | Length |
|------|--------|--------|
| `01-leather-sofa.mp4` | ElevenLabs Lip sync (HeyGen Avatar 6), episode 003-2026-11-19-got-myself-back | 33.8s, 1080x1920, 25fps |

## New scenes
Use `PROMPTS.md` section 8.2 with `--image shared/characters/baitoey/reference/face-closeup.png`.
Keep: face, glasses, bun, makeup, lavalier mic, seated waist-up, face to camera, hands away from face.

## Art style
- Style: photorealistic (current). Alternative researched: semi-realistic anime → `reports/สไตล์อนิเมะกึ่งสมจริง.md` ("real in light, not in skin") if a drawn version is ever needed.
- Why: host persona for lip-sync video mode; realism fits talk-show framing.

## Character block (paste into every image prompt)
```
The SAME fictional Thai woman as Image 1 (identity reference): late 20s, fair skin, soft rosy blush, natural rose lips, glossy black hair in a high messy bun with soft face-framing strands, slim gold metal oval glasses, tailored blazer over a simple top, small black lavalier mic on the lapel. Image 1 is the identity sheet. Do not redesign the character.
```
TH: ผู้หญิงไทยคนเดียวกับภาพที่ 1 อายุปลาย 20 ผิวขาว แก้มชมพูอ่อน ปากสีกุหลาบธรรมชาติ ผมดำเงามวยสูงหลวม ๆ มีปอยผมข้างหน้า แว่นกรอบทองทรงรีบาง สูทเข้ารูปทับเสื้อเรียบ ไมค์หนีบปกสีดำ ห้ามออกแบบตัวละครใหม่

## Voice (detail)
- Sound: warm, calm, mid-low pitch, unhurried; like a wise older sister.
- Speaking style: short sentences, pauses before the key line, "เรา" / "เธอ", no slang shouting.

## Emotion range

| Emotion | Face / body | Voice | Example line |
|---|---|---|---|
| calm (default) | soft smile, eyes to camera | default | "บางทีเราก็แค่เหนื่อย" |
| sad / deep | eyes lowered, small pause | `[softly]`, slower | |
| warm / comforting | gentle smile, slight head tilt | `[warmly]` | |
| wry | half smile, one brow | normal pace | |

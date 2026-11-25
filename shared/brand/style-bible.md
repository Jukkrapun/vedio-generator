# ตอนตีสอง — Style Bible (channel level)

Three layers. **Only Layer 1–2 are binding.** Layer 3 is a default that each series (`series.md`) and each episode may change to fit its content — the `art-director` skill should actively propose other looks so clips don't repeat.
Source: `reports/Art Director ตอนตีสอง.md` (2026-11-25). Values marked *(proposal)* need a phone check.

## Layer 1 — Channel identity (never changes)

| Item | Rule |
|---|---|
| Voice of the channel | Quiet, honest, never loud or clickbait. (The *visual* mood may be warm, funny, wry, eerie — the honesty stays.) |
| Subtitles | IBM Plex Sans Thai SemiBold, white + black outline + soft shadow, no box, spoken word gold. |
| End card | "ตอนตีสอง" end card on every short. |
| Playlist | `ตอนตีสอง · เรื่อง<topic>` |
| AI label | Always tick the platform AI label. Never strip C2PA metadata. |

## Layer 2 — Quality standards (every clip)

- **Safe zones (1080×1920):** subject + key text inside central ~900×1400; margins top 108, left 60, right 120, bottom 320–480 px; `lower` subtitles above y≈1600.
- **Frame 1 = cover:** a strong, lit image; never fade in from black.
- **Compression-safe tones:** no large pure-black areas or blown whites (platforms band them). Light grain helps.
- **Light has a clear, motivated source** and the subject sits in it — whatever the time of day.
- **Thai text:** max two font families; line height 1.3–1.5× so vowels/tone marks never collide; hook/cover text may use Kanit SemiBold. *(proposal sizes @1080 wide: hook 90–120 px, subtitles 60–72 px)*
- **AI images:** no text/logos/watermarks in images; character matches its reference sheet; a human checks hands and faces; never send photos of real people to Codex.
- **Prompt structure:** Style / Character / Shot / Constraints blocks (see `art-director` skill). Shared constraints block:

```
Vertical 9:16. Main subject inside the central 60% of the frame, nothing important in the bottom 25%.
Clear foreground / midground / background separation for depth parallax; clean subject edges.
No text, letters, logos, watermarks or signatures anywhere.
```

## Layer 3 — Default mood (changeable per series / episode)

Channel default, used when nothing better fits the content:
- Late night, cool blue/navy base with one warm practical light (lamp, phone glow, streetlight, convenience-store sign), lifted shadows, subtle grain, slow parallax, hard cuts.
- Default palette *(proposal)*: navy `#141B2D`–`#1E2A44`, teal `#2F5D6B`, warm `#F2A65A`/`#FFC98B`, gold `#E8C170`.

Change it when the content asks for it — e.g. a midday office for a meeting joke, dawn for a hopeful ending, a bright cartoon world for ส้มฉุน, a daytime scene inside a bedtime story. Keep it from feeling like another channel through Layer 1, not through forcing night.

Series starting points (each `series.md` owns and may override):

| Series | Starting look |
|---|---|
| love-quotes | warm, intimate close shots |
| work-talk | office/commute; tone may be wry or funny, time of day follows the story |
| living-life | everyday rooms, windows, muted |
| night-stories | storybook, 16:9, chapter cards |
| poc/cat-2am | 2D cartoon (`image_rules`) |

**Anti-repetition:** before a new episode, compare with the last 3–5 of that series; don't repeat 3+ of palette / time of day / setting / shot pattern / pose / opening image.

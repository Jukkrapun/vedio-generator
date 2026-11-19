# Host: <name>

Fictional AI-generated person. Must not resemble any real person or celebrity.

## Identity
- Name (on-screen persona):
- Age look:
- Personality / speaking vibe:
- Default voice: ElevenLabs `<voice_id>` (<voice name>)

## Look (keep identical in every image)
- Face:
- Hair:
- Makeup:
- Outfit (default):

## Base prompt (prepend to every image request)
```
Photorealistic vertical 9:16 portrait of the SAME fictional Thai woman as the reference image ...
```

## Scenes (`scenes/`)
Each scene = one still image used as the lip-sync source. Requirements for lip-sync:
face clearly visible and front-facing, mouth closed and unobstructed, mic not covering mouth/chin,
chest-up framing, lower third of frame calm for subtitles.

| File | Mood | Use for |
|------|------|---------|
| `01-....png` | | |

## reference/
Clean front-facing headshots used to keep the face consistent when generating new scenes.

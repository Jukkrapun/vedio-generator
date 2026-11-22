# Baitoey looks

One folder per look = outfit + background, picked per episode to match its content.
`episode.json` → `"host": {"character": "baitoey", "look": "<folder>"}`.

Each folder: `scene.png` (1080x1920, face to camera, waist-up), `look.md` (set/outfit/mood/fits),
optional `base.mp4` (talking footage; fal engines need it, MuseTalk uses `scene.png` if absent).

Choosing: reuse an existing look when its "Fits" matches the topic. Only when nothing fits,
create a new one (Codex, PROMPTS.md 8.2, `--image ../reference/face-closeup.png`), keeping
face, glasses, bun, makeup, lavalier mic. Name: `<set>-<mood>` kebab-case.

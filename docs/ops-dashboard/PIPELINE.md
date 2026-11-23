# Ops Dashboard — Phase 2: production pipeline

Create clips from the web with a review gate at every stage. Decided with the user 2026-11-23.

## Concepts

- **Order (งาน)** = one request made from a `PROMPTS.md` template (e.g. "ทำคลิปทดลอง 5 คลิป"). Shown as **one card**;
  opening it lists every episode the order produced and the stage each one is at.
- **Episode stages** — each episode moves on its own, approved one at a time (A+B):

| # | stage | review in web | redo | approve → |
|---|---|---|---|---|
| ① | `script` | segment text, cards, image prompts, publish.md | edit inline, or ask Claude to revise | Codex images |
| ② | `images` | one image per segment | regenerate one image (prompt editable; old file kept in `images/_old/`) | voice |
| ③ | `voice` | each segment's audio + full voice | re-record one segment (optionally edited text) | render |
| ④ | `render` | full clip (kept as a take in render history) | render again | done → posting queue |

  Episodes can also be **dropped** (❌). "Approve the rest" runs all remaining stages in one go.

## Data (files on the host, no DB)

- `.ops/orders/<id>.json` — `{id, template, title, series, prompt, created_at, job_id, episodes: ["<series>/<slug>", ...]}`.
  Episodes are discovered by the worker: folders created while the order's Claude job ran.
- `episode.json` → `"review"` — `{"stage": "script|images|voice|render|done|dropped", "order": "<id>"}`.
  Episodes without `review` (made before Phase 2 / in chat) count as done.
  Busy state comes from the job queue (a running job for that episode), not from the file.

## Templates from PROMPTS.md

Each `## n.` section with a fenced block is a template. `[ ... ]` → a form field; `[a / b / c]` → a select;
series names (`love-quotes`, …) → series select. Read live, so editing PROMPTS.md changes the form.
The web always appends a guard to the prompt: write scripts only (episode.json + script.md + publish.md via
`tools/new_episode.py`), no images / TTS / render / posting.

## Jobs (ops/worker.py)

| type | runs |
|---|---|
| `claude` | `claude -p <prompt>` (Read/Write/Edit/Glob/Grep + `tools/new_episode.py`, `tools/catalog.py` only) |
| `revise` | `claude -p` "revise episode X: <note>" — same tool limits |
| `images` | `tools/images.py <ep>` (missing images only) |
| `regen_image` | move `images/<file>` to `images/_old/<file>-<time>`, optionally update `image_prompt`, then `images.py` |
| `voice` | `tools/tts.py <ep>` |
| `regen_voice` | delete `audio/NN-<id>.*` + its manifest entry, then `tts.py` |
| `render` | `tools/render_reel.py <ep>` |

After a stage job succeeds the episode moves to the next stage's review (`review.stage`); approving a stage queues
the next job. Claude and Codex need the host logins, so **the worker runs on the host** (`ops/start-worker.ps1`);
the web stays in Docker.

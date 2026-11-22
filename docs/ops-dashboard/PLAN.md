# Ops Dashboard — Phase 1 Plan

Web app to run the daily posting routine of the channel **ตอนตีสอง** from phone or PC.
Audience of this doc: the implementer (Codex) generating the screens, then Claude wiring the backend.

UI language: **Thai**. Code, file names, identifiers: English.

---

## 1. Goals (Phase 1)

1. See which platform slots (TikTok / YouTube Shorts / Facebook Reels) are still unposted **today**.
2. See how many rendered clips are left, per platform (not yet posted there).
3. See which clips were posted where, when, with link.
4. See the suggested clip for each of today's slots and mark it **posted** (writes back to `episode.json`).
5. Watch the rendered clip and read `script.md` / `publish.md` (copy captions with one tap).
6. Create a new episode and run `produce.py` from the web (tts + render only in Docker; see §8).

Non-goals Phase 1: analytics charts, editing scripts in the browser, YouTube/TikTok API upload, Codex image generation and MuseTalk from inside Docker.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router, TypeScript, Server Components, Route Handlers) |
| UI | shadcn/ui + Tailwind CSS v4 + lucide-react icons |
| Font | IBM Plex Sans Thai (next/font/google) |
| Auth | Single password from `.env` → signed httpOnly cookie (`jose`), middleware guard |
| Worker | Python 3.13 + ffmpeg, runs existing `tools/*.py` |
| Deploy | docker compose, **bind mounts only** — no data inside containers |

No database. **`content/<series>/episodes/<ep>/episode.json` is the source of truth.**

---

## 3. Data model (existing files — do not change their format)

### Episode folder
`content/<series>/episodes/<NNN>-<YYYY-MM-DD>-<slug>/`
- `episode.json` — `title`, `tags[]`, `mode` (`image`|`video`), `segments[]`, `posts[]`
- `script.md`, `publish.md` — markdown
- Rendered video: `output/<series>/<folder-name>.mp4` (may be missing → status `draft`)

Series today: `love-quotes`, `work-talk` (discover by listing `content/*/series.md`).

### `posts[]` entry (format already written by `tools/publish_fb.py` and read by `tools/catalog.py`)
```json
{
  "platform": "facebook",          // "facebook" | "youtube" | "tiktok"
  "date": "2026-11-22",            // Thai local date
  "time": "22:00",                 // slot time HH:MM
  "url": "https://...",            // optional, may be ""
  "views": 0, "likes": 0, "saves": 0,
  "video_id": "...",               // facebook only
  "source": "web"                  // new optional field: "web" | "publish_fb"
}
```

### Episode status (same rule as `catalog.py`)
`draft` (no mp4) → `rendered` (mp4 exists, no posts) → `posted` (has posts).

### New: `.ops/schedule.json` (git-ignored, editable later)
```json
{
  "timezone": "Asia/Bangkok",
  "slots": {
    "tiktok":   ["12:00", "19:00", "22:00"],
    "youtube":  ["12:00", "20:00"],
    "facebook": ["20:00", "22:00"]
  },
  "main_slot": "22:00",
  "test_until": "2026-12-06"
}
```
Created with these defaults on first start if missing.

### New: `.ops/picks.json` — manual overrides of the planner
```json
{ "2026-11-22": { "tiktok@22:00": "love-quotes/010-2026-11-20-ordinary-days" } }
```

### New: `.ops/jobs/<id>.json` + `.ops/logs/<id>.log`
```json
{ "id": "20261122-153012-ab12", "type": "produce", "args": {"episode": "content/love-quotes/episodes/010-..."},
  "status": "queued|running|done|failed", "created_at": "...", "started_at": null, "finished_at": null, "exit_code": null }
```

Episode id used everywhere in the app: `<series>/<folder-name>`.

---

## 4. Planner rules (`web/lib/planner.ts`)

For today (Asia/Bangkok), for every `(platform, slot)`:
1. If a post exists with that platform + today's date + slot time → **posted** (show that episode).
2. Else if `.ops/picks.json` has an override → **planned** (that episode).
3. Else auto-pick from rendered episodes **not yet posted on that platform** and not already picked today for that platform:
   - `main_slot` (22:00): prefer episodes tagged `strong` in `tags`, then oldest number.
   - Other slots: oldest number first, alternating series between consecutive slots.
   - Same episode may be used across different platforms the same day (clips are reused cross-platform).
4. If nothing left → **empty** ("คลิปหมด").
5. Slot state shown: `posted` (green), `due` (time passed, not posted — red), `upcoming` (amber), `empty` (grey).

"Clips left" per platform = rendered episodes with no post on that platform. "Days left" = left ÷ slots/day for that platform (floor).

---

## 5. Screens

Mobile first (360px) → tablet → desktop (≥1024px). Dark theme default (late-night brand), light theme toggle. Accent color: warm gold `#E8B04B` (matches subtitle highlight). Bottom tab bar on mobile, left sidebar on desktop.

Navigation: **วันนี้** · **คลิป** · **สร้าง/งาน** · (settings icon top-right)

### 5.1 Login — `/login`
- Centered card: channel name "ตอนตีสอง", password field, button "เข้าสู่ระบบ".
- Error toast "รหัสผ่านไม่ถูกต้อง". Rate limit 5 tries / 5 min per IP.

### 5.2 Today — `/` (most important screen)
**Header:** date in Thai (`วันอาทิตย์ 22 พ.ย. 2569`), progress `ลงแล้ว 3/7 สล็อต`.

**Summary row (3 stat cards, horizontal scroll on mobile):** per platform — icon + name, `ลงแล้ว x/y วันนี้`, `เหลือ N คลิป (~D วัน)`. Card turns red if N < slots/day × 2.

**Slot list:**
- Mobile: vertical timeline grouped by time (12:00, 19:00, 20:00, 22:00). Each slot card:
  - Platform badge (TT / YT / FB with brand-neutral colors), time, state badge.
  - Episode thumbnail (first frame poster, 9:16, 64px wide), title, series chip, `★ main` badge for 22:00.
  - Buttons: `คัดลอก caption` (copies that platform's caption from `publish.md`), `ดูคลิป`, `เปลี่ยนคลิป` (sheet listing candidates), primary `ลงแล้ว`.
  - Facebook slots also show `ตั้งเวลา FB` (see §6).
- Desktop: table — rows = time slots, columns = TikTok / YouTube / Facebook, cell = mini card (same content); cells for slots a platform doesn't use are blank.

**"ลงแล้ว" dialog:** URL input (optional), time pre-filled with slot time, confirm. On success toast "บันทึกแล้ว" and card turns green. Undo button in toast (removes that post).

### 5.3 Clips — `/episodes`
- Filters: series (tabs: ทั้งหมด / love-quotes / work-talk), status (draft / rendered / posted), "ยังไม่ลง" platform filter (TT/YT/FB), search by title.
- Mobile: card list. Desktop: DataTable with columns: # · ชื่อ · series · status · TT · YT · FB · views รวม.
- Platform cells: ✓ with date (tap = open URL) or "—".
- Top stats: total clips, rendered, left per platform.

### 5.4 Episode detail — `/episodes/[series]/[slug]`
- Desktop: two columns — left video player (9:16, max-h 80vh), right tabs. Mobile: video on top, tabs below.
- Video: `<video controls playsInline preload="metadata">` from `/api/video/[series]/[slug]` (HTTP Range). If no mp4: placeholder "ยังไม่ได้ render" + button `Produce`.
- Tabs:
  - **Script** — rendered `script.md`; plus segment list from `episode.json` (id, text).
  - **Publish** — `publish.md` split into YouTube / TikTok / Facebook sub-tabs; every code block / field has a copy button.
  - **Posts** — list of posts (platform, date time, url, views/likes/saves), add post (same dialog as 5.2 but platform + date selectable), edit stats, delete with confirm.
- Header actions: `Produce`, `สร้าง catalog ใหม่`.

### 5.5 Create & Jobs — `/jobs`
- **New episode form:** series (select), slug (kebab-case validated `^[a-z0-9]+(-[a-z0-9]+)*$`), mode (image/video). Submit → job `new_episode` → link to the new episode.
- **Job list:** status badges, type, episode, duration; tap → job detail with live log (SSE, auto-scroll, monospace) and `ยกเลิก` for running jobs.
- Only one job runs at a time; others queue.

### 5.6 Settings — `/settings`
- Edit schedule slots per platform (chips add/remove time), main slot. Saves `.ops/schedule.json`.
- Logout.

### Shared components (shadcn)
`button, card, badge, tabs, dialog, alert-dialog, sheet, input, select, table, toast (sonner), skeleton, dropdown-menu, separator, scroll-area`.
Custom: `PlatformBadge`, `SlotCard`, `StatCard`, `EpisodeCard`, `CopyButton`, `VideoPlayer`, `JobLog`, `BottomNav`, `Sidebar`, `ThemeToggle`.

Empty states / loading skeletons for every list. All touch targets ≥ 44px.

---

## 6. API (Next.js Route Handlers, all behind auth)

| Method | Path | Does |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | cookie session |
| GET | `/api/today?date=` | planner output |
| GET | `/api/episodes` | list with status + posts summary |
| GET | `/api/episodes/[series]/[slug]` | episode.json + script.md + publish.md |
| POST | `/api/episodes/[series]/[slug]/posts` | append post `{platform,date,time,url}` → enqueue `catalog` |
| PATCH/DELETE | `/api/episodes/[series]/[slug]/posts/[index]` | edit stats / remove post → enqueue `catalog` |
| PUT | `/api/picks` | set override `{date, platform, time, episode}` |
| GET | `/api/video/[series]/[slug]` | stream mp4 with Range |
| GET | `/api/poster/[series]/[slug]` | first-frame jpg (worker makes it with ffmpeg, cached in `.ops/posters/`) |
| POST | `/api/jobs` | enqueue `{type, args}`; types: `new_episode`, `produce`, `catalog`, `publish_fb`, `poster` |
| GET | `/api/jobs` · `/api/jobs/[id]` | list / detail |
| GET | `/api/jobs/[id]/log` | SSE tail of log file |
| DELETE | `/api/jobs/[id]` | cancel |
| GET/PUT | `/api/schedule` | schedule.json |

**Facebook schedule:** `publish_fb` job runs `tools/publish_fb.py <episode> --at "<date> <time>"`. The UI must show an AlertDialog first: "โพสต์จริงไปที่ Facebook Page — ยืนยัน?" plus reminder "อย่าลืมติด AI info label ใน Meta Business Suite". Offer `--dry-run` checkbox. The script logs the post itself, so the UI must not also append.

**File writes:** atomic (write temp file in same dir → rename), with a per-file lock (`proper-lockfile`), preserve `ensure_ascii=False` style: `JSON.stringify(data, null, 2) + "\n"`. Path params validated against the listed episodes (no path traversal).

---

## 7. Worker (`ops/worker.py`)

- Polls `.ops/jobs/` every 2 s, runs oldest `queued` job, one at a time, stdout+stderr → `.ops/logs/<id>.log`.
- Commands (cwd = repo root):
  - `new_episode` → `python tools/new_episode.py <series> <slug> --mode <mode>`
  - `produce` → `python tools/produce.py <episode>` (Phase 1: fails clearly if images are missing — log tells user to run images on host)
  - `catalog` → `python tools/catalog.py <series>`
  - `publish_fb` → `python tools/publish_fb.py <episode> --at "<when>" [--dry-run]`
  - `poster` → `ffmpeg -ss 0.5 -i <mp4> -frames:v 1 -vf scale=270:-1 .ops/posters/<id>.jpg`
- Cancel: web writes `"cancel_requested": true`; worker terminates the process.
- Same script runs on the host (`.venv\Scripts\python.exe ops/worker.py`) in Phase 2 for Codex / MuseTalk jobs — keep it OS-agnostic.

---

## 8. Docker

```
docker-compose.yml
docker/web.Dockerfile      node:22-alpine, next build (output: standalone)
docker/worker.Dockerfile   python:3.13-slim + ffmpeg + fonts-thai-tlwg, pip install -r requirements.txt
```

```yaml
services:
  web:
    build: { context: ., dockerfile: docker/web.Dockerfile }
    ports: ["0.0.0.0:3800:3800"]        # reachable from phone on LAN / Tailscale
    env_file: .env                       # OPS_PASSWORD, OPS_SESSION_SECRET
    environment: { REPO_ROOT: /repo, TZ: Asia/Bangkok }
    volumes:
      - ./content:/repo/content
      - ./output:/repo/output:ro
      - ./.ops:/repo/.ops
    restart: unless-stopped
  worker:
    build: { context: ., dockerfile: docker/worker.Dockerfile }
    env_file: .env
    environment: { TZ: Asia/Bangkok }
    working_dir: /repo
    volumes:
      - ./content:/repo/content
      - ./output:/repo/output
      - ./shared:/repo/shared:ro
      - ./tools:/repo/tools:ro
      - ./ops:/repo/ops:ro
      - ./.ops:/repo/.ops
      - ./.env:/repo/.env:ro
    restart: unless-stopped
```

New `.env` keys: `OPS_PASSWORD`, `OPS_SESSION_SECRET` (32+ random chars). Add `.ops/` and `web/node_modules/`, `web/.next/` to `.gitignore`.

Phone access: LAN `http://<pc-ip>:3800` or Tailscale. Windows firewall must allow port 3800.

---

## 9. Folder layout

```
web/
  app/(auth)/login/page.tsx
  app/(app)/layout.tsx            sidebar / bottom nav
  app/(app)/page.tsx              Today
  app/(app)/episodes/page.tsx
  app/(app)/episodes/[series]/[slug]/page.tsx
  app/(app)/jobs/page.tsx  jobs/[id]/page.tsx
  app/(app)/settings/page.tsx
  app/api/...                     route handlers (§6)
  components/ui/                  shadcn
  components/                     custom components (§5)
  lib/repo.ts                     read/write episodes, publish.md parsing
  lib/planner.ts                  §4
  lib/jobs.ts  lib/auth.ts  lib/time.ts (Asia/Bangkok helpers, Thai date format, Buddhist year)
  middleware.ts                   auth guard
ops/worker.py
docker/  docker-compose.yml
```

`publish.md` parsing: split on level-2 headings containing `YouTube`, `TikTok`, `Facebook` (case-insensitive); inside each, treat fenced code blocks and `**Label:**` lines as copyable fields. Read `content/*/_template/publish.md` to confirm the structure before coding.

---

## 10. Build order

1. **Codex — screens with mock data** (`web/lib/mock.ts` shaped exactly like §3/§6 responses): layout + nav, Login, Today, Episodes, Episode detail, Jobs, Settings. Responsive + dark/light. No real file IO.
2. **Claude — backend:** `lib/repo.ts`, planner, route handlers, auth, swap mocks for real data.
3. **Claude — worker + Docker**, end-to-end test on real episodes (mark posted → `catalog.md` updates).
4. User test on phone for 1–2 days, then Phase 2 (host worker for images / MuseTalk, stats entry).

## 11. Acceptance checks

- Today shows 7 slots for 2026-11-22 with default schedule; marking one posted updates `episode.json` and `catalog.md`, survives `docker compose down && up`.
- Clip counts match `catalog.md`.
- Video plays and seeks on iPhone Safari and Android Chrome.
- All pages usable at 360px width, no horizontal scroll.
- Unauthenticated request to any page/API → redirect/401.
- `publish_fb` never runs without the confirm dialog.

---

## 12. Prompt for Codex (step 1)

> Read `docs/ops-dashboard/PLAN.md`. Implement step 1 of §10 only: scaffold `web/` with Next.js 15 (App Router, TypeScript), Tailwind v4 and shadcn/ui, and build every screen in §5 using mock data in `web/lib/mock.ts` that matches the shapes in §3 and §6 (use real-looking Thai titles from `content/*/catalog.md`). Mobile-first responsive, dark theme default with light toggle, accent `#E8B04B`, font IBM Plex Sans Thai. UI text in Thai. Do not implement file IO, auth logic, or API routes yet — pages call functions in `web/lib/data.ts` that currently return mock data, so they can be swapped later. Run `npm run build` and fix all errors before finishing.

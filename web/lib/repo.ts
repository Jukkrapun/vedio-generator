import "server-only";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Episode, EpisodeDetail, Job, JobType, Mode, Order, Post, Review, Schedule, Stage, Version, WorkerInfo } from "./types";

export const ROOT = path.resolve(process.env.REPO_ROOT ?? path.join(process.cwd(), ".."));
const OPS = path.join(ROOT, ".ops");
const SLUG_RE = /^\d{3}-\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// series key: "love-quotes", or nested "poc.sound" = content/poc/sound (one URL segment)
const SERIES_RE = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)?$/;
/** Folder of a series under content/ and output/: "poc.sound" -> "poc/sound". */
export const seriesPath = (series: string) => series.replace(".", "/");

export const defaultSchedule: Schedule = {
  timezone: "Asia/Bangkok",
  slots: { tiktok: ["12:00", "19:00", "22:00"], youtube: ["12:00", "20:00"], facebook: ["20:00", "22:00"] },
  main_slot: "22:00",
  test_until: "2026-12-06",
};

// ---- small file helpers -------------------------------------------------
const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(file, next.catch(() => undefined));
  return next;
}
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf-8")) as T; } catch { return fallback; }
}
async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + "." + Date.now() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, file);
}
async function readText(file: string) { try { return await fs.readFile(file, "utf-8"); } catch { return ""; } }

// ---- episodes -----------------------------------------------------------
export async function listSeries(): Promise<string[]> {
  const content = path.join(ROOT, "content");
  const out: string[] = [];
  for (const top of await fs.readdir(content, { withFileTypes: true })) {
    if (!top.isDirectory() || top.name.startsWith("_")) continue;
    if (existsSync(path.join(content, top.name, "series.md"))) out.push(top.name);
    // nested series (e.g. content/poc/sound/series.md)
    for (const sub of await fs.readdir(path.join(content, top.name), { withFileTypes: true })) {
      if (sub.isDirectory() && !sub.name.startsWith("_") && sub.name !== "episodes" && existsSync(path.join(content, top.name, sub.name, "series.md")))
        out.push(top.name + "." + sub.name);
    }
  }
  return out.filter(name => SERIES_RE.test(name)).sort();
}
export function episodeDir(series: string, slug: string) { return path.join(ROOT, "content", seriesPath(series), "episodes", slug); }
/** Episode's current "mode" (image|video), as tools/media.py output_path() uses it. */
export function episodeMode(series: string, slug: string): Mode {
  try {
    const mode = JSON.parse(readFileSync(path.join(episodeDir(series, slug), "episode.json"), "utf-8")).mode;
    return mode === "video" ? "video" : "image";
  } catch { return "image"; }
}
/** Rendered video: output/<series>/<slug>-<mode>.mp4 (current mode), falling back to the old <slug>.mp4 name. */
export function videoFile(series: string, slug: string) {
  const current = path.join(ROOT, "output", seriesPath(series), `${slug}-${episodeMode(series, slug)}.mp4`);
  const legacy = path.join(ROOT, "output", seriesPath(series), slug + ".mp4");
  return existsSync(current) || !existsSync(legacy) ? current : legacy;
}

// ---- render history (archived by ops/worker.py) ---------------------------
export const VERSION_RE = /^\d{8}-\d{6}-(image|video|story)(-[a-z0-9-]+)?$/;
const historyDir = (series: string, slug: string) => path.join(ROOT, "output", seriesPath(series), "history", slug);
export function historyFile(series: string, slug: string, version: string) {
  if (!VERSION_RE.test(version)) throw new Error("bad version");
  return path.join(historyDir(series, slug), version + ".mp4");
}
export function posterFile(series: string, slug: string, version?: string) {
  return path.join(OPS, "posters", series, slug, (version ?? "current-" + episodeMode(series, slug)) + ".jpg");
}

async function listVersions(series: string, slug: string): Promise<Version[]> {
  const dir = historyDir(series, slug);
  if (!existsSync(dir)) return [];
  const ids = (await fs.readdir(dir)).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5))
    .filter(v => VERSION_RE.test(v) && existsSync(path.join(dir, v + ".mp4"))).sort();
  const id = series + "/" + slug;
  return Promise.all(ids.map(async (v, i) => {
    const meta = await readJson<Partial<Version>>(path.join(dir, v + ".json"), {});
    return {
      id: v, number: i + 1, mode: VERSION_RE.exec(v)![1] as Mode, variant: (VERSION_RE.exec(v)![2] ?? "").slice(1),
      source: (meta as { source?: string }).source ?? `${slug}-${VERSION_RE.exec(v)![1]}${VERSION_RE.exec(v)![2] ?? ""}.mp4`,
      rendered_at: meta.rendered_at ?? "", duration: meta.duration ?? null, lines: (meta.lines ?? []).map(line => textOf(line, (VERSION_RE.exec(v)![2] ?? "").slice(1))),
      videoUrl: `/api/video/${id}?v=${v}`, posterUrl: `/api/poster/${id}?v=${v}`,
    } satisfies Version;
  }));
}

/** Chosen take: episode.json "publish_version" if it still exists, else the newest non-experiment take of the current mode. */
function pickVersion(versions: Version[], wanted: string | undefined, mode: Mode) {
  // auto pick skips experiment takes (variant); pin one explicitly to post it
  const newest = [...versions].reverse();
  // story takes are per language (variant th/en): default to the newest Thai one
  return versions.find(v => v.id === wanted) ?? newest.find(v => v.mode === mode && !v.variant)
    ?? (mode === "story" ? newest.find(v => v.mode === "story" && v.variant === "th") : undefined)
    ?? newest.find(v => !v.variant) ?? newest[0] ?? null;
}

/** Validates series/slug against the real folders (no path traversal). */
export async function resolveEpisode(series: string, slug: string) {
  if (!SERIES_RE.test(series) || !SLUG_RE.test(slug)) return null;
  const dir = episodeDir(series, slug);
  return existsSync(path.join(dir, "episode.json")) ? dir : null;
}

/** Story mode keeps text per language ({th, en}); shorts use a plain string. */
export function textOf(text: unknown, lang?: string): string {
  if (typeof text === "string") return text;
  if (text && typeof text === "object") {
    const byLang = text as Record<string, string>;
    return (lang && byLang[lang]) || Object.entries(byLang).map(([k, v]) => k + ": " + v).join("\n");
  }
  return "";
}
type RawSegment = { id?: string; text?: string | Record<string, string>; skip?: boolean; cards?: string[]; image?: string; image_prompt?: string };
type RawEpisode = { title?: string; tags?: string[]; mode?: Mode; posts?: Post[]; publish_version?: string; review?: Review; segments?: RawSegment[] };

async function loadEpisode(series: string, slug: string): Promise<{ episode: Episode; raw: RawEpisode } | null> {
  const raw = await readJson<RawEpisode | null>(path.join(episodeDir(series, slug), "episode.json"), null);
  if (!raw) return null;
  const mode = raw.mode ?? "image";
  const versions = await listVersions(series, slug);
  const selected = pickVersion(versions, raw.publish_version, mode);
  const hasCurrent = existsSync(videoFile(series, slug));
  const posts = (raw.posts ?? []).map(p => ({ ...p, url: p.url ?? "", views: Number(p.views ?? 0), likes: Number(p.likes ?? 0), saves: Number(p.saves ?? 0), time: p.time ?? "" }));
  const id = series + "/" + slug;
  return {
    raw,
    episode: {
      review: raw.review ?? null, id, series, slug, title: raw.title || slug, tags: raw.tags ?? [], mode,
      status: posts.length ? "posted" : selected || hasCurrent ? "rendered" : "draft",
      // before the worker has archived anything, fall back to the current render file
      videoUrl: selected?.videoUrl ?? (hasCurrent ? "/api/video/" + id : null),
      posterUrl: selected?.posterUrl ?? (hasCurrent ? "/api/poster/" + id : null),
      posts, versions, selectedVersion: selected?.id ?? null,
      pinnedVersion: raw.publish_version && selected?.id === raw.publish_version ? selected.id : null,
    },
  };
}

/** Pin a take for posting (null = back to "newest take of the current mode"). */
export async function selectVersion(series: string, slug: string, version: string | null) {
  const dir = await resolveEpisode(series, slug);
  if (!dir) throw new Error("episode not found");
  if (version && !existsSync(historyFile(series, slug, version))) throw new Error("version not found");
  const file = path.join(dir, "episode.json");
  await withLock(file, async () => {
    const data = await readJson<Record<string, unknown>>(file, {});
    if (version) data.publish_version = version; else delete data.publish_version;
    await writeJson(file, data);
  });
}

/** Delete an unused take (not the chosen one, not one that was posted). */
export async function deleteVersion(series: string, slug: string, version: string) {
  const loaded = await loadEpisode(series, slug);
  if (!loaded) throw new Error("episode not found");
  if (loaded.episode.selectedVersion === version) throw new Error("ลบรอบที่เลือกไว้ลงไม่ได้");
  if (loaded.episode.posts.some(p => p.version === version)) throw new Error("ลบรอบที่ลงไปแล้วไม่ได้");
  const mp4 = historyFile(series, slug, version);
  await fs.rm(mp4, { force: true });
  await fs.rm(mp4.replace(/\.mp4$/, ".json"), { force: true });
  await fs.rm(posterFile(series, slug, version), { force: true });
}

export async function selectedVersionOf(series: string, slug: string) {
  return (await loadEpisode(series, slug))?.episode.selectedVersion ?? null;
}

export async function listEpisodes(): Promise<Episode[]> {
  const out: Episode[] = [];
  for (const series of await listSeries()) {
    const dir = path.join(ROOT, "content", seriesPath(series), "episodes");
    const slugs = existsSync(dir) ? (await fs.readdir(dir)).filter(s => SLUG_RE.test(s)).sort() : [];
    for (const slug of slugs) {
      const loaded = await loadEpisode(series, slug);
      if (loaded) out.push(loaded.episode);
    }
  }
  return out;
}

export async function getEpisodeDetail(series: string, slug: string): Promise<EpisodeDetail | null> {
  if (!(await resolveEpisode(series, slug))) return null;
  const loaded = await loadEpisode(series, slug);
  if (!loaded) return null;
  const dir = episodeDir(series, slug);
  return {
    ...loaded.episode,
    segments: (loaded.raw.segments ?? []).map((s, i) => {
      const id = s.id ?? String(i + 1);
      const audio = `audio/${String(i).padStart(2, "0")}-${id}.mp3`;
      return { id, text: textOf(s.text), cards: s.cards ?? [], image: s.image ?? "", image_prompt: s.image_prompt ?? "", skip: !!s.skip,
        audio: existsSync(path.join(dir, audio)) ? audio : null };
    }),
    script: await readText(path.join(dir, "script.md")),
    publish: await readText(path.join(dir, "publish.md")),
  };
}

export type PostOp =
  | { op: "add"; post: Post }
  | { op: "remove"; index: number }
  | { op: "update"; index: number; stats: Partial<Pick<Post, "views" | "likes" | "saves" | "url">> };

export async function changePosts(series: string, slug: string, change: PostOp): Promise<Post[]> {
  const dir = await resolveEpisode(series, slug);
  if (!dir) throw new Error("episode not found");
  const file = path.join(dir, "episode.json");
  return withLock(file, async () => {
    const data = await readJson<Record<string, unknown>>(file, {});
    const posts = [...((data.posts as Post[]) ?? [])];
    if (change.op === "add") posts.push(change.post);
    else if (change.index < 0 || change.index >= posts.length) throw new Error("bad index");
    else if (change.op === "remove") posts.splice(change.index, 1);
    else posts[change.index] = { ...posts[change.index], ...change.stats };
    await writeJson(file, { ...data, posts });
    return posts;
  });
}

// ---- schedule & picks ---------------------------------------------------
export async function getSchedule(): Promise<Schedule> {
  const file = path.join(OPS, "schedule.json");
  if (!existsSync(file)) await writeJson(file, defaultSchedule);
  return { ...defaultSchedule, ...(await readJson<Partial<Schedule>>(file, {})) };
}
export async function saveSchedule(schedule: Schedule) {
  const file = path.join(OPS, "schedule.json");
  await withLock(file, () => writeJson(file, schedule));
}
type Picks = Record<string, Record<string, string>>;
export async function getPicks(date: string): Promise<Record<string, string>> {
  return (await readJson<Picks>(path.join(OPS, "picks.json"), {}))[date] ?? {};
}
export async function setPick(date: string, key: string, episodeId: string | null) {
  const file = path.join(OPS, "picks.json");
  await withLock(file, async () => {
    const all = await readJson<Picks>(file, {});
    const day = { ...(all[date] ?? {}) };
    if (episodeId) day[key] = episodeId; else delete day[key];
    // keep only the last 14 days
    const kept = Object.fromEntries(Object.entries({ ...all, [date]: day }).sort().slice(-14));
    await writeJson(file, kept);
  });
}

// ---- jobs ---------------------------------------------------------------
const JOBS = path.join(OPS, "jobs");
const LOGS = path.join(OPS, "logs");
type StoredJob = Omit<Job, "log"> & { cancel_requested?: boolean };

export async function listJobs(limit = 50): Promise<Job[]> {
  if (!existsSync(JOBS)) return [];
  const files = (await fs.readdir(JOBS)).filter(f => f.endsWith(".json")).sort().reverse().slice(0, limit);
  const jobs = await Promise.all(files.map(f => readJson<StoredJob | null>(path.join(JOBS, f), null)));
  return jobs.filter((j): j is StoredJob => !!j).map(j => ({ ...j, log: [] }));
}
export async function getJob(id: string, tail = 400): Promise<Job | null> {
  if (!/^[0-9a-z-]+$/.test(id)) return null;
  const job = await readJson<StoredJob | null>(path.join(JOBS, id + ".json"), null);
  if (!job) return null;
  const log = (await readText(path.join(LOGS, id + ".log"))).replace(/\r/g, "").split("\n");
  if (log.at(-1) === "") log.pop();
  return { ...job, log: log.slice(-tail) };
}

const JOB_TYPES: JobType[] = ["new_episode", "produce", "catalog", "publish_fb", "poster", "claude", "revise", "images", "regen_image", "voice", "regen_voice", "render"];
export async function createJob(type: JobType, args: Record<string, string | boolean>): Promise<Job> {
  if (!JOB_TYPES.includes(type)) throw new Error("unknown job type");
  let episodeId: string | undefined;
  if (type === "new_episode") {
    if (!(await listSeries()).includes(String(args.series))) throw new Error("unknown series");
    if (!NAME_RE.test(String(args.slug))) throw new Error("slug must be kebab-case");
    if (!["image", "video"].includes(String(args.mode))) throw new Error("bad mode");
  } else if (type === "claude") {
    if (!String(args.prompt ?? "").trim()) throw new Error("empty prompt");
  } else if (type === "catalog") {
    if (!(await listSeries()).includes(String(args.series))) throw new Error("unknown series");
  } else {
    const [series, slug] = String(args.episode ?? "").split("/");
    if (!(await resolveEpisode(series, slug))) throw new Error("episode not found");
    episodeId = series + "/" + slug;
    if (type === "publish_fb" && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(args.when))) throw new Error("bad time");
    if (type === "publish_fb") args = { ...args, version: (await selectedVersionOf(series, slug)) ?? "" };
    if (type === "poster" && args.version && !VERSION_RE.test(String(args.version))) throw new Error("bad version");
    if (type === "revise" && !String(args.note ?? "").trim()) throw new Error("empty note");
    if (type === "regen_image" || type === "regen_voice") {
      const raw = await readJson<RawEpisode>(path.join(episodeDir(series, slug), "episode.json"), {});
      if (!raw.segments?.some(seg => seg.id === args.segment)) throw new Error("segment not found");
    }
  }
  const now = new Date();
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" }).format(now).replace(/[-: ]/g, "");
  const id = stamp.slice(0, 8) + "-" + stamp.slice(8) + "-" + Math.random().toString(36).slice(2, 6);
  const job: StoredJob = { id, type, args, episodeId, status: "queued", created_at: now.toISOString(), started_at: null, finished_at: null, exit_code: null };
  await writeJson(path.join(JOBS, id + ".json"), job);
  return { ...job, log: [] };
}
export async function cancelJob(id: string) {
  const file = path.join(JOBS, id + ".json");
  await withLock(file, async () => {
    const job = await readJson<StoredJob | null>(file, null);
    if (!job) throw new Error("job not found");
    if (job.status === "queued") await writeJson(file, { ...job, status: "failed", exit_code: 130, finished_at: new Date().toISOString() });
    else if (job.status === "running") await writeJson(file, { ...job, cancel_requested: true });
  });
}

// ---- worker status ------------------------------------------------------------
export async function workerInfo(): Promise<WorkerInfo> {
  const w = await readJson<{ kind?: "host" | "docker"; ts?: number; claude?: boolean; codex?: boolean } | null>(path.join(OPS, "worker.json"), null);
  if (!w?.kind) return null;
  return { kind: w.kind, claude: !!w.claude, codex: !!w.codex, online: Date.now() / 1000 - (w.ts ?? 0) < 30 };
}

// ---- orders (one card per request; docs/ops-dashboard/PIPELINE.md) ---------------
const ORDERS = path.join(OPS, "orders");
export async function listOrders(): Promise<Order[]> {
  if (!existsSync(ORDERS)) return [];
  const files = (await fs.readdir(ORDERS)).filter(f => f.endsWith(".json")).sort().reverse();
  return (await Promise.all(files.map(f => readJson<Order | null>(path.join(ORDERS, f), null)))).filter((o): o is Order => !!o);
}
export async function getOrder(id: string) {
  if (!/^[0-9a-z-]+$/.test(id)) return null;
  return readJson<Order | null>(path.join(ORDERS, id + ".json"), null);
}
export async function createOrder(input: { template: string; title: string; series: string; prompt: string }): Promise<Order> {
  const job = await createJob("claude", { prompt: input.prompt, order: "" });
  const order: Order = { id: job.id, template: input.template, title: input.title.slice(0, 120), series: input.series, prompt: input.prompt, created_at: job.created_at, job_id: job.id, episodes: [] };
  await writeJson(path.join(ORDERS, order.id + ".json"), order);
  // the job was queued before the order existed: point it at the order (same id)
  const jobFile = path.join(JOBS, job.id + ".json");
  await withLock(jobFile, async () => {
    const stored = await readJson<Record<string, unknown>>(jobFile, {});
    if (stored.status === "queued") await writeJson(jobFile, { ...stored, args: { ...(stored.args as object), order: order.id } });
  });
  return order;
}

// ---- stage transitions ----------------------------------------------------------
const NEXT: Record<string, { stage: Stage; job?: JobType }> = {
  script: { stage: "images", job: "images" },
  images: { stage: "voice", job: "voice" },
  voice: { stage: "render", job: "render" },
  render: { stage: "done" },
};
async function setReview(series: string, slug: string, change: (review: Review) => Review) {
  const dir = await resolveEpisode(series, slug);
  if (!dir) throw new Error("episode not found");
  const file = path.join(dir, "episode.json");
  return withLock(file, async () => {
    const data = await readJson<Record<string, unknown>>(file, {});
    const review = change((data.review as Review) ?? { stage: "done" });
    await writeJson(file, { ...data, review });
    return review;
  });
}
export type StageAction = "approve" | "all" | "drop" | "restore" | "back";
/** approve: stage OK -> next stage (+ its job). all: run every remaining stage (produce.py), then review the render. */
export async function stageAction(series: string, slug: string, action: StageAction, target?: Stage) {
  const id = series + "/" + slug;
  let job: JobType | undefined;
  const review = await setReview(series, slug, current => {
    if (action === "drop") return { ...current, stage: "dropped" };
    if (action === "restore") return { ...current, stage: "script" };
    if (action === "back") {
      if (!target || !["script", "images", "voice", "render"].includes(target)) throw new Error("bad stage");
      return { ...current, stage: target };
    }
    if (action === "all") {
      if (current.stage === "done" || current.stage === "dropped") throw new Error("nothing left to approve");
      job = "produce";
      return { ...current, stage: "render" };
    }
    const next = NEXT[current.stage];
    if (!next) throw new Error("nothing to approve");
    job = next.job;
    return { ...current, stage: next.stage };
  });
  if (job) await createJob(job, { episode: id });
  return review;
}

/** Inline script edits from the review page. */
export async function updateScript(series: string, slug: string, body: { segments?: { id: string; text?: string; cards?: string[]; image_prompt?: string }[]; publish?: string; title?: string }) {
  const dir = await resolveEpisode(series, slug);
  if (!dir) throw new Error("episode not found");
  const file = path.join(dir, "episode.json");
  await withLock(file, async () => {
    const data = await readJson<RawEpisode & Record<string, unknown>>(file, {});
    for (const edit of body.segments ?? []) {
      const seg = data.segments?.find(s => s.id === edit.id);
      if (!seg) throw new Error("segment not found");
      if (typeof edit.text === "string") seg.text = edit.text;
      if (Array.isArray(edit.cards)) seg.cards = edit.cards.map(String).filter(Boolean);
      if (typeof edit.image_prompt === "string") seg.image_prompt = edit.image_prompt;
    }
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    await writeJson(file, data);
  });
  if (typeof body.publish === "string") await fs.writeFile(path.join(dir, "publish.md"), body.publish, "utf-8");
}

/** Episode files the review page may show (images, audio). */
export async function episodeAsset(series: string, slug: string, rel: string) {
  const dir = await resolveEpisode(series, slug);
  if (!dir || !/^(images|audio)\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp|mp3)$/.test(rel)) return null;
  const file = path.join(dir, rel);
  return existsSync(file) ? file : null;
}

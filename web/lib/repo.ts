import "server-only";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Episode, EpisodeDetail, Job, JobType, Mode, Post, Schedule } from "./types";

export const ROOT = path.resolve(process.env.REPO_ROOT ?? path.join(process.cwd(), ".."));
const OPS = path.join(ROOT, ".ops");
const SLUG_RE = /^\d{3}-\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  const entries = await fs.readdir(path.join(ROOT, "content"), { withFileTypes: true });
  return entries.filter(e => e.isDirectory() && existsSync(path.join(ROOT, "content", e.name, "series.md"))).map(e => e.name).sort();
}
export function episodeDir(series: string, slug: string) { return path.join(ROOT, "content", series, "episodes", slug); }
export function videoFile(series: string, slug: string) { return path.join(ROOT, "output", series, slug + ".mp4"); }
export function posterFile(series: string, slug: string) { return path.join(OPS, "posters", series, slug + ".jpg"); }

/** Validates series/slug against the real folders (no path traversal). */
export async function resolveEpisode(series: string, slug: string) {
  if (!NAME_RE.test(series) || !SLUG_RE.test(slug)) return null;
  const dir = episodeDir(series, slug);
  return existsSync(path.join(dir, "episode.json")) ? dir : null;
}

type RawEpisode = { title?: string; tags?: string[]; mode?: Mode; posts?: Post[]; segments?: { id?: string; text?: string; skip?: boolean }[] };

async function loadEpisode(series: string, slug: string): Promise<{ episode: Episode; raw: RawEpisode } | null> {
  const raw = await readJson<RawEpisode | null>(path.join(episodeDir(series, slug), "episode.json"), null);
  if (!raw) return null;
  const hasVideo = existsSync(videoFile(series, slug));
  const posts = (raw.posts ?? []).map(p => ({ ...p, url: p.url ?? "", views: Number(p.views ?? 0), likes: Number(p.likes ?? 0), saves: Number(p.saves ?? 0), time: p.time ?? "" }));
  const id = series + "/" + slug;
  return {
    raw,
    episode: {
      id, series, slug, title: raw.title || slug, tags: raw.tags ?? [], mode: raw.mode ?? "image",
      status: posts.length ? "posted" : hasVideo ? "rendered" : "draft",
      videoUrl: hasVideo ? "/api/video/" + id : null,
      posterUrl: hasVideo ? "/api/poster/" + id : null,
      posts,
    },
  };
}

export async function listEpisodes(): Promise<Episode[]> {
  const out: Episode[] = [];
  for (const series of await listSeries()) {
    const dir = path.join(ROOT, "content", series, "episodes");
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
    segments: (loaded.raw.segments ?? []).filter(s => !s.skip).map((s, i) => ({ id: s.id ?? String(i + 1), text: s.text ?? "" })),
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

const JOB_TYPES: JobType[] = ["new_episode", "produce", "catalog", "publish_fb", "poster"];
export async function createJob(type: JobType, args: Record<string, string | boolean>): Promise<Job> {
  if (!JOB_TYPES.includes(type)) throw new Error("unknown job type");
  let episodeId: string | undefined;
  if (type === "new_episode") {
    if (!(await listSeries()).includes(String(args.series))) throw new Error("unknown series");
    if (!NAME_RE.test(String(args.slug))) throw new Error("slug must be kebab-case");
    if (!["image", "video"].includes(String(args.mode))) throw new Error("bad mode");
  } else if (type === "catalog") {
    if (!(await listSeries()).includes(String(args.series))) throw new Error("unknown series");
  } else {
    const [series, slug] = String(args.episode ?? "").split("/");
    if (!(await resolveEpisode(series, slug))) throw new Error("episode not found");
    episodeId = series + "/" + slug;
    if (type === "publish_fb" && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(args.when))) throw new Error("bad time");
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

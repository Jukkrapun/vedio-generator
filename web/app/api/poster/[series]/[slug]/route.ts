import { existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import { createJob, historyFile, listJobs, posterFile, resolveEpisode, VERSION_RE, videoFile } from "@/lib/repo";

type Params = { params: Promise<{ series: string; slug: string }> };

/** First-frame jpg of a take (?v=) or the current render; queues a "poster" job when missing or stale. */
export async function GET(request: Request, { params }: Params) {
  const { series, slug } = await params;
  const version = new URL(request.url).searchParams.get("v") ?? undefined;
  if (!(await resolveEpisode(series, slug)) || (version && !VERSION_RE.test(version))) return new Response("not found", { status: 404 });
  const poster = posterFile(series, slug, version);
  const video = version ? historyFile(series, slug, version) : videoFile(series, slug);
  const fresh = existsSync(poster) && (!existsSync(video) || statSync(poster).mtimeMs >= statSync(video).mtimeMs);
  if (!fresh && existsSync(video)) {
    const id = series + "/" + slug;
    const pending = (await listJobs(30)).some(j => j.type === "poster" && j.episodeId === id && String(j.args.version ?? "") === (version ?? "") && (j.status === "queued" || j.status === "running"));
    if (!pending) await createJob("poster", { episode: id, version: version ?? "" });
  }
  if (!existsSync(poster)) return new Response("not ready", { status: 404 });
  return new Response(new Uint8Array(await fs.readFile(poster)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}

import { existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import { createJob, listJobs, posterFile, resolveEpisode, videoFile } from "@/lib/repo";

type Params = { params: Promise<{ series: string; slug: string }> };

/** First-frame jpg made by the worker; queues a "poster" job when it is missing or older than the video. */
export async function GET(_: Request, { params }: Params) {
  const { series, slug } = await params;
  if (!(await resolveEpisode(series, slug))) return new Response("not found", { status: 404 });
  const poster = posterFile(series, slug), video = videoFile(series, slug);
  const fresh = existsSync(poster) && (!existsSync(video) || statSync(poster).mtimeMs >= statSync(video).mtimeMs);
  if (!fresh && existsSync(video)) {
    const id = series + "/" + slug;
    const pending = (await listJobs(30)).some(j => j.type === "poster" && j.episodeId === id && (j.status === "queued" || j.status === "running"));
    if (!pending) await createJob("poster", { episode: id });
  }
  if (!existsSync(poster)) return new Response("not ready", { status: 404 });
  return new Response(new Uint8Array(await fs.readFile(poster)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}

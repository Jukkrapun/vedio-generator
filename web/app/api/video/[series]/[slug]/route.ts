import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { historyFile, resolveEpisode, VERSION_RE, videoFile } from "@/lib/repo";

type Params = { params: Promise<{ series: string; slug: string }> };

/** Streams a take (?v=<version> from output/<series>/history/) or the current render, with HTTP Range (iOS Safari seeking). */
export async function GET(request: Request, { params }: Params) {
  const { series, slug } = await params;
  const version = new URL(request.url).searchParams.get("v");
  if (!(await resolveEpisode(series, slug)) || (version && !VERSION_RE.test(version))) return new Response("not found", { status: 404 });
  const file = version ? historyFile(series, slug, version) : videoFile(series, slug);
  if (!existsSync(file)) return new Response("not found", { status: 404 });
  const size = statSync(file).size;
  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": version ? "private, max-age=86400, immutable" : "private, max-age=60" };
  const match = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new Response(body, { headers: { ...headers, "Content-Length": String(size) } });
  }
  let start = match[1] ? Number(match[1]) : size - Number(match[2]);
  let end = match[1] && match[2] ? Number(match[2]) : size - 1;
  start = Math.max(0, start); end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
  return new Response(body, { status: 206, headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` } });
}

import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { resolveEpisode, videoFile } from "@/lib/repo";

type Params = { params: Promise<{ series: string; slug: string }> };

/** Streams output/<series>/<slug>.mp4 with HTTP Range support (needed for iOS Safari seeking). */
export async function GET(request: Request, { params }: Params) {
  const { series, slug } = await params;
  const file = (await resolveEpisode(series, slug)) && videoFile(series, slug);
  if (!file || !existsSync(file)) return new Response("not found", { status: 404 });
  const size = statSync(file).size;
  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=60" };
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

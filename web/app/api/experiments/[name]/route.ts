import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { experimentFile } from "@/lib/experiments";

const TYPES: Record<string, string> = { mp4: "video/mp4", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

/** ?f=<file> from output/poc/<name>/ (videos with HTTP Range for seeking). */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const f = new URL(request.url).searchParams.get("f") ?? "";
  const file = experimentFile(name, f);
  if (!file) return new Response("not found", { status: 404 });
  const size = statSync(file).size;
  const headers: Record<string, string> = { "Content-Type": TYPES[f.split(".").pop()!.toLowerCase()], "Accept-Ranges": "bytes", "Cache-Control": "private, no-cache" };
  const match = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (!match) return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...headers, "Content-Length": String(size) } });
  let start = match[1] ? Number(match[1]) : size - Number(match[2]);
  let end = match[1] && match[2] ? Number(match[2]) : size - 1;
  start = Math.max(0, start); end = Math.min(end, size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream,
    { status: 206, headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` } });
}

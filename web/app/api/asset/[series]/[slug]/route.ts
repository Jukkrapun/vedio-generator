import { statSync } from "node:fs";
import fs from "node:fs/promises";
import { episodeAsset } from "@/lib/repo";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp3: "audio/mpeg" };

/** ?f=images/01-hook.png | audio/00-hook.mp3 — segment images and voice clips for the review page. */
export async function GET(request: Request, { params }: { params: Promise<{ series: string; slug: string }> }) {
  const { series, slug } = await params;
  const rel = new URL(request.url).searchParams.get("f") ?? "";
  const file = await episodeAsset(series, slug, rel);
  if (!file) return new Response("not found", { status: 404 });
  const ext = rel.split(".").pop()!.toLowerCase();
  return new Response(new Uint8Array(await fs.readFile(file)), {
    headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, no-cache", "Last-Modified": statSync(file).mtime.toUTCString() },
  });
}

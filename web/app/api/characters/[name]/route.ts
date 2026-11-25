import { statSync } from "node:fs";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { characterFile, updateCharacter, type CharacterUpdate } from "@/lib/characters";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp3: "audio/mpeg" };
type Ctx = { params: Promise<{ name: string }> };

/** ?f=reference/sheet.png | voice-samples/calm.mp3 */
export async function GET(request: Request, { params }: Ctx) {
  const { name } = await params;
  const rel = new URL(request.url).searchParams.get("f") ?? "";
  const file = characterFile(name, rel);
  if (!file) return new Response("not found", { status: 404 });
  const ext = rel.split(".").pop()!.toLowerCase();
  return new Response(new Uint8Array(await fs.readFile(file)), {
    headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, no-cache", "Last-Modified": statSync(file).mtime.toUTCString() },
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { name } = await params;
  let body: CharacterUpdate;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 }); }
  const error = await updateCharacter(name, body);
  return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true });
}

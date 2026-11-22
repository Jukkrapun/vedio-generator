import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/auth";

const attempts = new Map<string, number[]>();
const WINDOW = 5 * 60_000, MAX = 5;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter(t => now - t < WINDOW);
  if (recent.length >= MAX) return NextResponse.json({ error: "ลองหลายครั้งเกินไป รอ 5 นาที" }, { status: 429 });
  const expected = process.env.OPS_PASSWORD;
  if (!expected) return NextResponse.json({ error: "OPS_PASSWORD ยังไม่ได้ตั้งใน .env" }, { status: 500 });
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !same(password, expected)) {
    attempts.set(ip, [...recent, now]);
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  attempts.delete(ip);
  const { token, maxAge } = await createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: process.env.OPS_SECURE_COOKIE === "1" });
  return response;
}

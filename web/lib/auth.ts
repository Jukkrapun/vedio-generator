import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ops_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.OPS_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("OPS_SESSION_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(value);
}
export async function createSession() {
  const token = await new SignJWT({ sub: "owner" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(MAX_AGE + "s").sign(secret());
  return { token, maxAge: MAX_AGE };
}
export async function verifySession(token: string | undefined) {
  if (!token) return false;
  try { await jwtVerify(token, secret()); return true; } catch { return false; }
}

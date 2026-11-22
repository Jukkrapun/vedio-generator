import "server-only";
import { NextResponse } from "next/server";

export async function handle(fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /not found/.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

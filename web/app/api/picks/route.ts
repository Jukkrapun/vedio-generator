import { handle } from "@/lib/api";
import { getPicks, setPick } from "@/lib/repo";
import { platforms } from "@/lib/types";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => handle(async () => {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("bad date");
  return getPicks(date);
});

export const PUT = (request: Request) => handle(async () => {
  const { date, platform, time, episode } = await request.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !platforms.includes(platform)) throw new Error("bad pick");
  await setPick(date, platform + "@" + time, episode ? String(episode) : null);
});

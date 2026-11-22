import { handle } from "@/lib/api";
import { setPick } from "@/lib/repo";
import { platforms } from "@/lib/types";

export const PUT = (request: Request) => handle(async () => {
  const { date, platform, time, episode } = await request.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !platforms.includes(platform)) throw new Error("bad pick");
  await setPick(date, platform + "@" + time, episode ? String(episode) : null);
});

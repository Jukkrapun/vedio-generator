import { handle } from "@/lib/api";
import { getSchedule, saveSchedule } from "@/lib/repo";
import { platforms, type Schedule } from "@/lib/types";

export const dynamic = "force-dynamic";
export const GET = () => handle(getSchedule);
export const PUT = (request: Request) => handle(async () => {
  const body = await request.json() as Schedule;
  const current = await getSchedule();
  const times = (v: unknown) => {
    if (!Array.isArray(v) || !v.every(t => /^\d{2}:\d{2}$/.test(t))) throw new Error("bad slots");
    return [...new Set(v as string[])].sort();
  };
  const slots = Object.fromEntries(platforms.map(p => [p, times(body.slots?.[p] ?? [])])) as Schedule["slots"];
  const schedule = { ...current, slots, main_slot: /^\d{2}:\d{2}$/.test(body.main_slot) ? body.main_slot : current.main_slot };
  await saveSchedule(schedule);
  return schedule;
});

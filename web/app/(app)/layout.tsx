import { Shell } from "@/components/shell";
import { OpsProvider } from "@/components/ops-provider";
import { getEpisodes, getJobs, getSchedule } from "@/lib/data";
import { getPicks } from "@/lib/repo";
import { bangkokNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { date } = bangkokNow();
  const [episodes, jobs, schedule, picks] = await Promise.all([getEpisodes(), getJobs(), getSchedule(), getPicks(date)]);
  return <OpsProvider initialEpisodes={episodes} initialJobs={jobs} initialSchedule={schedule} initialPicks={picks} date={date}><Shell>{children}</Shell></OpsProvider>;
}

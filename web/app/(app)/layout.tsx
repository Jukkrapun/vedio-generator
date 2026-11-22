import { Shell } from "@/components/shell";
import { OpsProvider } from "@/components/ops-provider";
import { getEpisodes, getJobs, getSchedule } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [episodes, jobs, schedule] = await Promise.all([getEpisodes(), getJobs(), getSchedule()]);
  return <OpsProvider initialEpisodes={episodes} initialJobs={jobs} initialSchedule={schedule}><Shell>{children}</Shell></OpsProvider>;
}

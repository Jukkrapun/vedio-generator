import { getSeries } from "@/lib/data";
import { listExperiments } from "@/lib/experiments";
import { EpisodesScreen } from "@/components/episodes";
import { Experiments } from "@/components/experiments";

export const metadata = { title: "ทดสอบ (POC)" };
export const dynamic = "force-dynamic";
export default async function PocPage() {
  const [series, experiments] = await Promise.all([getSeries(), listExperiments()]);
  return <><EpisodesScreen series={series} test /><Experiments items={experiments} /></>;
}

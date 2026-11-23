import { getSeries } from "@/lib/data";
import { EpisodesScreen } from "@/components/episodes";
export const metadata = { title: "ทดสอบ (POC)" };
export const dynamic = "force-dynamic";
export default async function PocPage() { return <EpisodesScreen series={await getSeries()} test />; }

import { getSeries } from "@/lib/data";
import { EpisodesScreen } from "@/components/episodes";
export const metadata = { title: "คลิป" };
export const dynamic = "force-dynamic";
export default async function EpisodesPage() { return <EpisodesScreen series={await getSeries()} />; }

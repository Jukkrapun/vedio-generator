import { getEpisode, getToday, parsePublish } from "@/lib/data";
import { EpisodeScreen } from "@/components/episode-detail";
export const metadata = { title: "รายละเอียดคลิป" };
export default async function EpisodePage({ params }: { params: Promise<{ series: string; slug: string }> }) {
  const { series, slug } = await params;
  const id = series + "/" + slug;
  const [episode, today] = await Promise.all([getEpisode(id), getToday()]);
  return <EpisodeScreen key={id} id={id} initial={episode} date={today.date} fields={parsePublish(episode?.publish ?? "")} />;
}

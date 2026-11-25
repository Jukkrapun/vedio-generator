import { handle } from "@/lib/api";
import { getEpisodeDetail } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Full episode (segments, script, publish.md, subtitle position) for the review page's live reload. */
export const GET = (_: Request, { params }: { params: Promise<{ series: string; slug: string }> }) => handle(async () => {
  const { series, slug } = await params;
  const episode = await getEpisodeDetail(series, slug);
  if (!episode) throw new Error("episode not found");
  return episode;
});

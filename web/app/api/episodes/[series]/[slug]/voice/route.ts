import fs from "node:fs/promises";
import path from "node:path";
import { handle } from "@/lib/api";
import { episodeDir, resolveEpisode } from "@/lib/repo";
import { currentVoiceKey, setEpisodeVoice } from "@/lib/voices";

type Params = { params: Promise<{ series: string; slug: string }> };

/** GET: the episode's current voice key. POST {tts, voice, model}: switch voice and re-record all segments. */
export const GET = (_: Request, { params }: Params) => handle(async () => {
  const { series, slug } = await params;
  if (!(await resolveEpisode(series, slug))) throw new Error("episode not found");
  const raw = JSON.parse(await fs.readFile(path.join(episodeDir(series, slug), "episode.json"), "utf-8"));
  return { key: currentVoiceKey(raw) };
});
export const POST = (request: Request, { params }: Params) => handle(async () => {
  const { series, slug } = await params;
  return setEpisodeVoice(series, slug, await request.json());
});

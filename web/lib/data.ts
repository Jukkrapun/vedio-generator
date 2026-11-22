import "server-only";
import * as repo from "./repo";
import { planToday } from "./planner";
import { parsePublish } from "./publish";
import { bangkokNow } from "./time";

export async function getEpisodes() { return repo.listEpisodes(); }
export async function getEpisode(id: string) {
  const [series, slug] = id.split("/");
  return repo.getEpisodeDetail(series, slug);
}
export async function getToday() {
  const { date, time } = bangkokNow();
  const [episodes, schedule, picks] = await Promise.all([repo.listEpisodes(), repo.getSchedule(), repo.getPicks(date)]);
  return { ...planToday(episodes, schedule, picks, date, time), picks };
}
export async function getSchedule() { return repo.getSchedule(); }
export async function getJobs() { return repo.listJobs(); }
export async function getJob(id: string) { return repo.getJob(id); }
export async function getSeries() { return repo.listSeries(); }
export async function getPublishFields() {
  const episodes = await repo.listEpisodes();
  const details = await Promise.all(episodes.filter(e => e.videoUrl).map(e => repo.getEpisodeDetail(e.series, e.slug)));
  return Object.fromEntries(details.filter(d => !!d).map(d => [d!.id, parsePublish(d!.publish)]));
}

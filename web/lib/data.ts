import { mockDate, mockEpisodes, mockJobs, mockSchedule, mockSeries, mockTime } from "./mock";
import type { Episode } from "./types";
import { planToday } from "./planner";
import { parsePublish } from "./publish";

export async function getEpisodes(): Promise<Episode[]> {
  return mockEpisodes.map(({ id, series, slug, title, tags, mode, status, videoUrl, posterUrl, posts }) =>
    ({ id, series, slug, title, tags, mode, status, videoUrl, posterUrl, posts }));
}
export async function getEpisode(id: string) {
  return mockEpisodes.find(episode => episode.id === id) ?? null;
}
export async function getToday() {
  return planToday(await getEpisodes(), mockSchedule, {}, mockDate, mockTime);
}
export async function getSchedule() { return mockSchedule; }
export async function getJobs() { return mockJobs; }
export async function getJob(id: string) { return mockJobs.find(job => job.id === id) ?? null; }
export async function getSeries() { return mockSeries; }
export async function getPublishFields() {
  return Object.fromEntries(mockEpisodes.map(episode => [episode.id, parsePublish(episode.publish)]));
}

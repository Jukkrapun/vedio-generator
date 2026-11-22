import { mockDate, mockEpisodes, mockJobs, mockSchedule, mockSeries, mockTime } from "./mock";
import { platforms, type Episode, type Platform, type Schedule, type Slot, type Today } from "./types";

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

export function candidates(episodes: Episode[], platform: Platform) {
  return episodes.filter(episode => episode.videoUrl && !episode.posts.some(post => post.platform === platform));
}
export function planToday(episodes: Episode[], schedule: Schedule, picks: Record<string, string>, date: string, now: string): Today {
  const slots = platforms.flatMap(platform => {
    const times = [...schedule.slots[platform]].sort();
    const available = candidates(episodes, platform).sort((a, b) => a.slug.localeCompare(b.slug));
    const planned = new Map<string, Slot>();
    const used = new Set<string>();
    for (const time of times) {
      const episode = episodes.find(item => item.posts.some(post => post.platform === platform && post.date === date && post.time === time));
      const override = available.find(item => item.id === picks[platform + "@" + time]);
      if (episode) {
        planned.set(time, { platform, time, state: "posted", episode, post: episode.posts.find(post => post.platform === platform && post.date === date && post.time === time) });
      } else if (override && !used.has(override.id)) {
        planned.set(time, { platform, time, state: time <= now ? "due" : "upcoming", episode: override });
        used.add(override.id);
      }
    }
    const main = schedule.main_slot;
    if (times.includes(main) && !planned.has(main)) {
      const episode = available.find(item => item.tags.includes("strong") && !used.has(item.id)) ?? available.find(item => !used.has(item.id));
      if (episode) {
        planned.set(main, { platform, time: main, state: main <= now ? "due" : "upcoming", episode });
        used.add(episode.id);
      }
    }
    let previousSeries: string | undefined;
    return times.map(time => {
      const reserved = planned.get(time);
      if (reserved) {
        previousSeries = reserved.episode?.series;
        return reserved;
      }
      const episode = available.find(item => !used.has(item.id) && item.series !== previousSeries) ?? available.find(item => !used.has(item.id)) ?? null;
      if (episode) used.add(episode.id);
      previousSeries = episode?.series;
      return { platform, time, state: episode ? time <= now ? "due" : "upcoming" : "empty", episode } satisfies Slot;
    });
  });
  return { date, time: now, slots, summary: platforms.map(platform => {
    const total = schedule.slots[platform].length;
    const left = candidates(episodes, platform).length;
    return { platform, total, left, days: total ? Math.floor(left / total) : 0, posted: slots.filter(slot => slot.platform === platform && slot.state === "posted").length };
  }) };
}

export type PublishField = { label: string; value: string; block?: boolean };
export function parsePublish(markdown: string): Record<Platform, PublishField[]> {
  const fields: Record<Platform, PublishField[]> = { tiktok: [], youtube: [], facebook: [] };
  let platform: Platform | undefined;
  let label = "ข้อความ";
  let block: string[] | null = null;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      if (block && platform) fields[platform].push({ label, value: block.join("\n"), block: true });
      block = block ? null : [];
      continue;
    }
    if (block) { block.push(line); continue; }
    if (line.startsWith("## ")) {
      platform = platforms.find(key => line.toLowerCase().includes(key));
      label = "ข้อความ";
      continue;
    }
    if (!platform) continue;
    const field = line.match(/^(?:- )?\*\*([^*]+)\*\*(.*)$/);
    if (field) {
      label = field[1].replace(/:$/, "");
      const value = field[2].trim().replace(/^:\s*/, "");
      if (value && !/^\(.*\):$/.test(value)) fields[platform].push({ label, value });
    } else {
      const setting = line.match(/^- ([^:]+):\s*(.+)$/);
      if (setting) fields[platform].push({ label: setting[1], value: setting[2] });
    }
  }
  return fields;
}

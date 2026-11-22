"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Episode, EpisodeDetail, Job, JobType, Mode, Post, Schedule } from "@/lib/types";

function useOpsState(initialEpisodes: Episode[], initialJobs: Job[], initialSchedule: Schedule) {
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [created, setCreated] = useState<Record<string, EpisodeDetail>>({});
  const [jobs, setJobs] = useState(initialJobs);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [picks, setPicks] = useState<Record<string, string>>({});

  function updatePosts(id: string, update: (posts: Post[]) => Post[]) {
    setEpisodes(current => current.map(episode => {
      if (episode.id !== id) return episode;
      const posts = update(episode.posts);
      return { ...episode, posts, status: posts.length ? "posted" : episode.videoUrl ? "rendered" : "draft" };
    }));
  }

  function enqueue(type: JobType, args: Job["args"], episodeId?: string) {
    const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    setJobs(current => [{ id, type, args, episodeId, status: "queued", created_at: new Date().toISOString(), started_at: null, finished_at: null, exit_code: null, log: ["เพิ่มงานเข้าคิวแล้ว"] }, ...current]);
    return id;
  }

  function newEpisode(series: string, name: string, mode: Mode) {
    const max = Math.max(0, ...episodes.filter(episode => episode.series === series).map(episode => Number(episode.slug.split("-")[0])));
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const slug = String(max + 1).padStart(3, "0") + "-" + date + "-" + name;
    const id = series + "/" + slug;
    const episode: EpisodeDetail = { id, series, slug, mode, title: name, tags: [], status: "draft", videoUrl: null, posterUrl: null, posts: [], segments: [], script: "", publish: "" };
    setCreated(current => ({ ...current, [id]: episode }));
    setEpisodes(current => [episode, ...current]);
    return enqueue("new_episode", { series, slug: name, mode }, id);
  }

  function cancelJob(id: string) {
    setJobs(current => current.map(job => job.id === id && job.status === "running" ? { ...job, status: "failed", finished_at: new Date().toISOString(), exit_code: 130, log: [...job.log, "ผู้ใช้ยกเลิกงาน"] } : job));
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setJobs(current => {
        const running = current.find(job => job.status === "running");
        const target = running ?? [...current].reverse().find(job => job.status === "queued");
        if (!target) return current;
        const now = new Date().toISOString();
        const done = running && target.log.length >= 3;
        const log = done ? "งานตัวอย่างเสร็จแล้ว" : running ? "กำลังประมวลผลงานตัวอย่าง" : "เริ่มงานตัวอย่าง";
        return current.map(job => job.id === target.id ? {
          ...job, log: [...job.log, log], status: done ? "done" : "running",
          started_at: job.started_at ?? now, finished_at: done ? now : null, exit_code: done ? 0 : null,
        } : job);
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return { episodes, created, jobs, schedule, setSchedule, picks, setPicks, updatePosts, enqueue, newEpisode, cancelJob };
}

const OpsContext = createContext<ReturnType<typeof useOpsState> | null>(null);
export function OpsProvider({ children, initialEpisodes, initialJobs, initialSchedule }: { children: ReactNode; initialEpisodes: Episode[]; initialJobs: Job[]; initialSchedule: Schedule }) {
  return <OpsContext.Provider value={useOpsState(initialEpisodes, initialJobs, initialSchedule)}>{children}</OpsContext.Provider>;
}
export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("OpsProvider is required");
  return context;
}

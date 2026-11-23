"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Episode, EpisodeDetail, Job, JobType, Mode, Post, Schedule } from "@/lib/types";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (response.status === 401) { window.location.href = "/login"; throw new Error("unauthorized"); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "request failed");
  return data as T;
}
export const fail = (error: unknown) => { toast.error("ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error))); throw error; };

function useOpsState(initialEpisodes: Episode[], initialJobs: Job[], initialSchedule: Schedule, initialPicks: Record<string, string>, date: string) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [created] = useState<Record<string, EpisodeDetail>>({});
  const [jobs, setJobs] = useState(initialJobs);
  const [schedule, setScheduleState] = useState(initialSchedule);
  const [picks, setPicksState] = useState(initialPicks);
  const activeJobs = useRef(new Set<string>());

  const refreshEpisodes = useCallback(async () => {
    setEpisodes(await api<Episode[]>("/api/episodes"));
    router.refresh();
  }, [router]);

  function setPosts(id: string, posts: Post[]) {
    setEpisodes(current => current.map(e => e.id !== id ? e : { ...e, posts, status: posts.length ? "posted" : e.videoUrl ? "rendered" : "draft" }));
  }
  async function postOp(id: string, body: unknown) {
    const { posts } = await api<{ posts: Post[] }>("/api/episodes/" + id + "/posts", { method: "POST", json: body }).catch(fail);
    setPosts(id, posts);
    return posts;
  }
  /** Returns the new post's index so it can be undone. */
  async function addPost(id: string, post: Post) { return (await postOp(id, { op: "add", post })).length - 1; }
  async function removePost(id: string, index: number) { await postOp(id, { op: "remove", index }); }
  async function updateStats(id: string, index: number, stats: Pick<Post, "views" | "likes" | "saves">) { await postOp(id, { op: "update", index, stats }); }

  async function setPick(platform: string, time: string, episode: string | null) {
    await api("/api/picks", { method: "PUT", json: { date, platform, time, episode } }).catch(fail);
    setPicksState(current => {
      const next = { ...current };
      if (episode) next[platform + "@" + time] = episode; else delete next[platform + "@" + time];
      return next;
    });
  }
  async function setSchedule(next: Schedule) {
    setScheduleState(await api<Schedule>("/api/schedule", { method: "PUT", json: next }).catch(fail));
  }

  async function selectVersion(id: string, version: string | null) {
    await api("/api/episodes/" + id + "/version", { method: "PUT", json: { version } }).catch(fail);
    await refreshEpisodes();
  }
  async function deleteVersion(id: string, version: string) {
    await api("/api/episodes/" + id + "/version?v=" + version, { method: "DELETE" }).catch(fail);
    await refreshEpisodes();
  }

  async function enqueue(type: JobType, args: Job["args"]) {
    const job = await api<Job>("/api/jobs", { method: "POST", json: { type, args } }).catch(fail);
    setJobs(current => [job, ...current]);
    return job.id;
  }
  async function newEpisode(series: string, slug: string, mode: Mode) { return enqueue("new_episode", { series, slug, mode }); }
  async function cancelJob(id: string) { await api("/api/jobs/" + id, { method: "DELETE" }).catch(fail); }

  // Poll the job list; when a job finishes, reload episodes (new render, new post, new folder).
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const list = await api<Job[]>("/api/jobs");
        if (stopped) return;
        setJobs(current => list.map(job => ({ ...job, log: current.find(c => c.id === job.id)?.log ?? [] })));
        const running = new Set(list.filter(j => j.status === "queued" || j.status === "running").map(j => j.id));
        const finished = [...activeJobs.current].filter(id => !running.has(id));
        activeJobs.current = running;
        if (finished.some(id => list.find(j => j.id === id)?.type !== "poster")) await refreshEpisodes();
      } catch { /* offline: try again next tick */ }
    };
    void tick();
    const timer = window.setInterval(tick, 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [refreshEpisodes]);

  return { episodes, created, jobs, schedule, setSchedule, picks, setPick, addPost, removePost, updateStats, enqueue, newEpisode, cancelJob, refreshEpisodes, selectVersion, deleteVersion };
}

const OpsContext = createContext<ReturnType<typeof useOpsState> | null>(null);
export function OpsProvider({ children, initialEpisodes, initialJobs, initialSchedule, initialPicks, date }: { children: ReactNode; initialEpisodes: Episode[]; initialJobs: Job[]; initialSchedule: Schedule; initialPicks: Record<string, string>; date: string }) {
  return <OpsContext.Provider value={useOpsState(initialEpisodes, initialJobs, initialSchedule, initialPicks, date)}>{children}</OpsContext.Provider>;
}
export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("OpsProvider is required");
  return context;
}

/** Live job (with log) for the job detail page. */
export function useJob(id: string, initial: Job | null) {
  const [job, setJob] = useState(initial);
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try { const next = await api<Job>("/api/jobs/" + id); if (!stopped) setJob(next); } catch { /* ignore */ }
    };
    const timer = window.setInterval(tick, 1500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [id]);
  return job;
}

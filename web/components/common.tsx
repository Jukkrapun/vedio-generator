"use client";
import Link from "next/link";
import { AudioLines, Check, Clapperboard, Clock3, Copy, MoonStar, Play, Youtube, Facebook } from "lucide-react";
import { toast } from "sonner";
import type { Episode, EpisodeStatus, Job, Platform, Slot } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/card";

export const platformNames: Record<Platform, string> = { tiktok: "TikTok", youtube: "YouTube Shorts", facebook: "Facebook Reels" };
export const platformShort: Record<Platform, string> = { tiktok: "TT", youtube: "YT", facebook: "FB" };
const icons = { tiktok: AudioLines, youtube: Youtube, facebook: Facebook };
export const seriesNames: Record<string, string> = { "love-quotes": "เรื่องความรัก", "work-talk": "เรื่องงาน" };
export const episodeHref = (episode: Pick<Episode, "id">) => "/episodes/" + episode.id;
export const statusLabels: Record<EpisodeStatus, string> = { draft: "ฉบับร่าง", rendered: "พร้อมลง", posted: "ลงแล้ว" };
export const jobLabels: Record<Job["type"], string> = { new_episode: "สร้างตอนใหม่", produce: "ผลิตคลิป", catalog: "สร้างแค็ตตาล็อก", publish_fb: "ตั้งเวลา Facebook", poster: "สร้างภาพปก" };
const jobStatus: Record<Job["status"], string> = { queued: "รอคิว", running: "กำลังทำงาน", done: "เสร็จแล้ว", failed: "ไม่สำเร็จ" };
const slotStatus: Record<Slot["state"], string> = { posted: "ลงแล้ว", due: "เลยเวลา", upcoming: "รอลง", empty: "คลิปหมด" };

export function Brand() { return <span className="brand"><span className="brand-mark"><MoonStar size={20} /></span><strong>ตอนตีสอง</strong></span>; }
export function PlatformBadge({ platform, compact }: { platform: Platform; compact?: boolean }) {
  const Icon = icons[platform];
  return <span className={"platform " + platform}><Icon size={15} aria-hidden />{compact ? platformShort[platform] : platformNames[platform]}</span>;
}
export function SlotBadge({ state }: { state: Slot["state"] }) {
  return <Badge className={state}>{state === "posted" ? <Check size={13} /> : state === "due" ? <Clock3 size={13} /> : null}{slotStatus[state]}</Badge>;
}
export function EpisodeStatusBadge({ status }: { status: EpisodeStatus }) { return <Badge className={status}>{statusLabels[status]}</Badge>; }
export function JobBadge({ status }: { status: Job["status"] }) { return <Badge className={status}>{jobStatus[status]}</Badge>; }
export function SeriesChip({ series }: { series: string }) { return <Badge>{seriesNames[series] ?? series}</Badge>; }
export function Empty({ children }: { children: React.ReactNode }) { return <div className="empty-state"><Clapperboard size={23} /><p>{children}</p></div>; }

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("คัดลอกแล้ว");
  } catch {
    toast.error("คัดลอกไม่ได้ กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง");
  }
}
export function CopyButton({ value, label = "คัดลอก" }: { value: string; label?: string }) {
  return <Button variant="outline" onClick={() => void copyText(value)}><Copy size={15} />{label}</Button>;
}
export function Poster({ episode, linked = false }: { episode: Episode; linked?: boolean }) {
  const image = episode.posterUrl ? <img src={episode.posterUrl} alt="" /> : <Clapperboard size={19} />;
  return linked ? <Link className="poster" href={episodeHref(episode)} aria-label={"ดูคลิป " + episode.title}>{image}<span className="poster-play"><Play size={14} fill="currentColor" /></span></Link> : <span className="poster">{image}</span>;
}
export function VideoPlayer({ episode }: { episode: Episode }) {
  return episode.videoUrl ? <video className="player" controls playsInline preload="metadata" poster={episode.posterUrl ?? undefined} src={episode.videoUrl} aria-label={"วิดีโอตัวอย่าง " + episode.title} />
    : <div className="player player-empty"><Clapperboard size={30} /><p>ยังไม่ได้เรนเดอร์</p></div>;
}
export function PostLink({ url, children }: { url: string; children: React.ReactNode }) {
  return /^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>;
}

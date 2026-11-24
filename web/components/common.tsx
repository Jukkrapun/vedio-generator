"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AudioLines, Check, Clapperboard, Clock3, Copy, Image as ImageIcon, MoonStar, Play, UserRound, Youtube, Facebook } from "lucide-react";
import { toast } from "sonner";
import type { Episode, EpisodeStatus, Job, Mode, Platform, Slot } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/card";

export const platformNames: Record<Platform, string> = { tiktok: "TikTok", youtube: "YouTube Shorts", facebook: "Facebook Reels", youtube_long: "YouTube คลิปยาว" };
export const platformShort: Record<Platform, string> = { tiktok: "TT", youtube: "YT", facebook: "FB", youtube_long: "YT ยาว" };
const icons = { tiktok: AudioLines, youtube: Youtube, facebook: Facebook, youtube_long: Youtube };
export const seriesNames: Record<string, string> = { "love-quotes": "เรื่องความรัก", "work-talk": "เรื่องงาน", "living-life": "เรื่องชีวิต", "night-stories": "เรื่องเล่ายามดึก", poc: "ทดสอบ (POC)", "poc.sound": "ทดสอบเสียง" };
/** Series used for experiments: shown under the "ทดสอบ" menu, kept out of the clips list and posting queue. */
export const TEST_SERIES = ["poc"];
export const isTestSeries = (series: string) => TEST_SERIES.includes(series.split(".")[0]);
export const listHref = (series: string) => isTestSeries(series) ? "/poc" : "/episodes";
export const episodeHref = (episode: Pick<Episode, "id">) => "/episodes/" + episode.id;
export const statusLabels: Record<EpisodeStatus, string> = { draft: "ฉบับร่าง", rendered: "พร้อมลง", posted: "ลงแล้ว" };
export const jobLabels: Record<Job["type"], string> = { new_episode: "สร้างตอนใหม่", produce: "ผลิตที่เหลือทั้งหมด", catalog: "สร้างแค็ตตาล็อก", publish_fb: "ตั้งเวลา Facebook", poster: "สร้างภาพปก", claude: "Claude เขียนบท", revise: "Claude แก้บท", images: "สร้างภาพ", regen_image: "สร้างภาพใหม่", voice: "ทำเสียง", regen_voice: "อัดเสียงใหม่", render: "เรนเดอร์" };
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
  const image = episode.posterUrl ? <img src={episode.posterUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /> : <Clapperboard size={19} />;
  return linked ? <Link className="poster" href={episodeHref(episode)} aria-label={"ดูคลิป " + episode.title}>{image}<span className="poster-play"><Play size={14} fill="currentColor" /></span></Link> : <span className="poster">{image}</span>;
}
export function VideoPlayer({ episode }: { episode: Episode }) {
  return episode.videoUrl ? <video className={"player" + (episode.mode === "story" ? " wide" : "")} controls playsInline preload="metadata" poster={episode.posterUrl ?? undefined} src={episode.videoUrl} aria-label={"วิดีโอตัวอย่าง " + episode.title} />
    : <div className={"player player-empty" + (episode.mode === "story" ? " wide" : "")}><Clapperboard size={30} /><p>ยังไม่ได้เรนเดอร์</p></div>;
}
export function PostLink({ url, children }: { url: string; children: React.ReactNode }) {
  return /^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>;
}
export const modeLabels: Record<Mode, string> = { image: "ภาพนิ่ง", video: "วิดีโอพิธีกร", story: "เรื่องยาว 16:9" };
export function ModeBadge({ mode }: { mode: Mode }) {
  const Icon = mode === "video" ? UserRound : mode === "story" ? Clapperboard : ImageIcon;
  return <Badge className={"mode-" + mode}><Icon size={13} aria-hidden />{modeLabels[mode]}</Badge>;
}
/** "รอบ 3/4" badge for the take chosen for posting. */
export function VersionBadge({ episode }: { episode: Episode }) {
  const take = episode.versions.find(v => v.id === episode.selectedVersion);
  if (!take) return null;
  return <Badge className="version" title={"render " + take.rendered_at}>รอบ {take.number}/{episode.versions.length}{take.variant ? " · " + take.variant : ""}</Badge>;
}
/** Render file of the take that will be posted, e.g. 010-2026-11-20-ordinary-days-image.mp4 */
export function FileName({ episode }: { episode: Episode }) {
  const take = episode.versions.find(v => v.id === episode.selectedVersion);
  const name = take?.source ?? (episode.videoUrl ? `${episode.slug}-${episode.mode}.mp4` : episode.slug);
  return <span className="file-name" title={name}>{name}</span>;
}
export function takeTime(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
/** Mode of the take that will be posted (falls back to episode.json "mode"). */
export const takeMode = (episode: Episode) => episode.versions.find(v => v.id === episode.selectedVersion)?.mode ?? episode.mode;
/** Back link to the clips / POC list that restores the last filters used there (kept in sessionStorage). */
export function rememberListUrl() {
  try { sessionStorage.setItem("list:" + (window.location.pathname === "/poc" ? "poc" : "episodes"), window.location.pathname + window.location.search); } catch { /* private mode */ }
}
export function BackToList({ series, children }: { series: string; children: React.ReactNode }) {
  const base = listHref(series);
  const [href, setHref] = useState(base);
  useEffect(() => {
    try { setHref(sessionStorage.getItem("list:" + (base === "/poc" ? "poc" : "episodes")) ?? base); } catch { /* ignore */ }
  }, [base]);
  return <Link className="back-link" href={href}>{children}</Link>;
}

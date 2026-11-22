"use client";
import Link from "next/link";
import { Check, Search } from "lucide-react";
import { useState } from "react";
import { candidates } from "@/lib/planner";
import { thaiShortDate } from "@/lib/time";
import { platforms, type Episode, type EpisodeStatus, type Platform } from "@/lib/types";
import { Empty, EpisodeStatusBadge, ModeBadge, PlatformBadge, PostLink, Poster, SeriesChip, episodeHref, modeLabels, platformNames, seriesNames, statusLabels } from "./common";
import { useOps } from "./ops-provider";
import { Card } from "./ui/card";

const statuses: EpisodeStatus[] = ["draft", "rendered", "posted"];
const numberFormat = new Intl.NumberFormat("th-TH");
function views(episode: Episode) { return numberFormat.format(episode.posts.reduce((sum, post) => sum + post.views, 0)); }

function PostCell({ episode, platform }: { episode: Episode; platform: Platform }) {
  const post = episode.posts.filter(item => item.platform === platform).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0];
  return post ? <PostLink url={post.url}><span className="post-date"><Check size={14} />{thaiShortDate(post.date)}</span></PostLink> : <span className="muted">—</span>;
}

export function EpisodesScreen({ series }: { series: string[] }) {
  const { episodes } = useOps();
  const [selectedSeries, setSeries] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const results = episodes.filter(episode =>
    (!selectedSeries || episode.series === selectedSeries) && (!status || episode.status === status) && (!mode || episode.mode === mode) &&
    (!platform || Boolean(episode.videoUrl) && !episode.posts.some(post => post.platform === platform)) &&
    episode.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  return <>
    <header className="page-heading"><div><h1>คลิปทั้งหมด</h1><p className="muted">ค้นหาคลิปและดูประวัติการลงแต่ละแพลตฟอร์ม</p></div></header>
    <section className="stats-grid clip-stats" aria-label="สรุปจำนวนคลิป">
      <Card className="stat-card"><span className="muted">คลิปทั้งหมด</span><div className="stat-count"><strong>{episodes.length}</strong><span>คลิป</span></div><p className="small muted">เรนเดอร์แล้ว {episodes.filter(episode => episode.videoUrl).length} คลิป</p></Card>
      {platforms.map(key => <Card key={key} className="stat-card"><PlatformBadge platform={key} /><div className="stat-count"><strong>{candidates(episodes, key).length}</strong><span>คลิปที่ยังไม่ลง</span></div></Card>)}
    </section>
    <section className="clip-list">
      <div className="segmented" aria-label="กรองตามซีรีส์">{["", ...series].map(key => <button key={key} aria-pressed={selectedSeries === key} onClick={() => setSeries(key)}>{key ? seriesNames[key] ?? key : "ทั้งหมด"}</button>)}</div>
      <div className="filters">
        <label className="search-field">ค้นหา<div className="input-icon"><Search size={17} /><input type="search" placeholder="ค้นหาชื่อคลิป" value={search} onChange={event => setSearch(event.target.value)} /></div></label>
        <label>สถานะ<select value={status} onChange={event => setStatus(event.target.value)}><option value="">ทุกสถานะ</option>{statuses.map(key => <option key={key} value={key}>{statusLabels[key]}</option>)}</select></label>
        <label>รูปแบบ<select value={mode} onChange={event => setMode(event.target.value)}><option value="">ทุกรูปแบบ</option>{(["image", "video"] as const).map(key => <option key={key} value={key}>{modeLabels[key]}</option>)}</select></label>
        <label>ยังไม่ลงใน<select value={platform} onChange={event => setPlatform(event.target.value)}><option value="">ทุกแพลตฟอร์ม</option>{platforms.map(key => <option key={key} value={key}>{platformNames[key]}</option>)}</select></label>
      </div>
      <p className="small muted result-count">พบ {results.length} คลิป</p>
      {!results.length ? <Empty>ไม่พบคลิปที่ตรงกับตัวกรอง</Empty> : <>
        <div className="desktop-clips card"><table><thead><tr><th scope="col">#</th><th scope="col">ชื่อคลิป</th><th scope="col">ซีรีส์</th><th scope="col">รูปแบบ</th><th scope="col">สถานะ</th>{platforms.map(key => <th key={key} scope="col"><PlatformBadge platform={key} compact /></th>)}<th scope="col">ยอดดูรวม</th></tr></thead><tbody>{results.map(episode => <tr key={episode.id}>
          <td className="muted">{episode.slug.split("-")[0]}</td><td><Link href={episodeHref(episode)}>{episode.title}</Link></td><td><SeriesChip series={episode.series} /></td><td><ModeBadge mode={episode.mode} /></td><td><EpisodeStatusBadge status={episode.status} /></td>{platforms.map(key => <td key={key}><PostCell episode={episode} platform={key} /></td>)}<td>{views(episode)}</td>
        </tr>)}</tbody></table></div>
        <div className="mobile-clips">{results.map(episode => <Card key={episode.id} className="clip-card">
          <div className="slot-episode"><Poster episode={episode} linked /><div className="slot-text"><Link href={episodeHref(episode)}>{episode.title}</Link><div className="tag-row"><SeriesChip series={episode.series} /><ModeBadge mode={episode.mode} /><EpisodeStatusBadge status={episode.status} /></div><p className="small muted">ยอดดูรวม {views(episode)}</p></div></div>
          <div className="clip-platforms">{platforms.map(key => <div key={key}><PlatformBadge platform={key} compact /><PostCell episode={episode} platform={key} /></div>)}</div>
        </Card>)}</div>
      </>}
    </section>
  </>;
}

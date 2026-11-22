"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink, History, ListRestart, Pencil, Play, Plus, Star, Trash2, WandSparkles } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import type { PublishField } from "@/lib/publish";
import { thaiShortDate } from "@/lib/time";
import { platforms, type Episode, type EpisodeDetail, type Platform, type Post, type Version } from "@/lib/types";
import { CopyButton, Empty, EpisodeStatusBadge, ModeBadge, PlatformBadge, PostLink, SeriesChip, VersionBadge, VideoPlayer, takeTime } from "./common";
import { useOps } from "./ops-provider";
import { PostForm } from "./post-form";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Confirm, Modal } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type Action = { kind: "add" } | { kind: "edit" | "delete"; index: number; post: Post } | { kind: "drop-take"; take: Version };

export function EpisodeScreen({ id, initial, date, fields }: { id: string; initial: EpisodeDetail | null; date: string; fields: Record<Platform, PublishField[]> }) {
  const { episodes, created, addPost, removePost, updateStats, enqueue, schedule, selectVersion, deleteVersion } = useOps();
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const details = initial ?? created[id];
  const episode = episodes.find(item => item.id === id);
  if (!details || !episode) return <><Button asChild variant="ghost"><Link href="/episodes"><ArrowLeft size={16} /> กลับไปที่คลิป</Link></Button><Empty>ไม่พบคลิปนี้</Empty></>;
  const close = () => setAction(null);
  async function queue(type: "produce" | "catalog") {
    const job = await enqueue(type, type === "produce" ? { episode: id } : { series: episode!.series });
    toast.success("เพิ่มงานเข้าคิวแล้ว");
    router.push("/jobs/" + job);
  }
  const shown = episode.versions.find(v => v.id === (preview ?? episode.selectedVersion));
  const playing: Episode = shown ? { ...episode, videoUrl: shown.videoUrl, posterUrl: shown.posterUrl } : episode;
  const produce = <Button onClick={() => queue("produce")}><WandSparkles size={16} /> ผลิตคลิป</Button>;
  return <>
    <Link className="back-link" href="/episodes"><ArrowLeft size={16} /> คลิปทั้งหมด</Link>
    <header className="page-heading"><div><div className="tag-row"><SeriesChip series={episode.series} /><ModeBadge mode={episode.mode} /><VersionBadge episode={episode} /><EpisodeStatusBadge status={episode.status} /></div><h1>{episode.title}</h1></div>
      <div className="heading-actions">{produce}<Button variant="outline" onClick={() => queue("catalog")}><ListRestart size={16} /> สร้างแค็ตตาล็อกใหม่</Button></div>
    </header>
    <div className="detail-grid">
      <div className="video-panel"><VideoPlayer key={playing.videoUrl ?? "none"} episode={playing} />{shown && <p className="small muted">กำลังแสดงรอบ {shown.number} · {takeTime(shown.rendered_at)}{shown.id === episode.selectedVersion ? " · ⭐ รอบที่จะลง" : ""}</p>}{!episode.videoUrl && produce}</div>
      <Card className="detail-card"><Tabs defaultValue="script">
        <TabsList aria-label="รายละเอียดคลิป"><TabsTrigger value="script">สคริปต์</TabsTrigger><TabsTrigger value="publish">ข้อมูลลงคลิป</TabsTrigger><TabsTrigger value="posts">โพสต์ ({episode.posts.length})</TabsTrigger><TabsTrigger value="history">ประวัติ ({episode.versions.length})</TabsTrigger></TabsList>
        <TabsContent value="script" className="tab-panel">
          {details.script ? <div className="markdown"><Markdown>{details.script}</Markdown></div> : <Empty>ยังไม่มีสคริปต์</Empty>}
          {!!details.segments.length && <><h2 className="subheading">ช่วงบรรยาย</h2><ol className="segment-list">{details.segments.map(segment => <li key={segment.id}><code>{segment.id}</code><span>{segment.text}</span></li>)}</ol></>}
        </TabsContent>
        <TabsContent value="publish" className="tab-panel">
          <Tabs defaultValue="youtube"><TabsList aria-label="แพลตฟอร์ม">{(["youtube", "tiktok", "facebook"] as const).map(platform => <TabsTrigger key={platform} value={platform}><PlatformBadge platform={platform} compact /></TabsTrigger>)}</TabsList>
            {platforms.map(platform => <TabsContent key={platform} value={platform} className="tab-panel"><div className="stack">{fields[platform].length ? fields[platform].map((field, index) => <div className="publish-field" key={index}>
              <div><strong>{field.label}</strong><CopyButton value={field.value} /></div>{field.block ? <pre>{field.value}</pre> : <p>{field.value}</p>}
            </div>) : <Empty>ยังไม่มีข้อมูลสำหรับแพลตฟอร์มนี้</Empty>}</div></TabsContent>)}
          </Tabs>
        </TabsContent>
        <TabsContent value="history" className="tab-panel">
          <div className="post-section-heading"><h2><History size={18} /> ประวัติการ render</h2>
            {episode.pinnedVersion && <Button variant="ghost" onClick={async () => { await selectVersion(id, null); toast.success("กลับไปใช้รอบล่าสุดอัตโนมัติ"); }}>ใช้รอบล่าสุดอัตโนมัติ</Button>}</div>
          <p className="small muted">{episode.pinnedVersion ? "เลือกรอบไว้เอง" : "ยังไม่ได้เลือก ใช้รอบล่าสุดของรูปแบบ " + (episode.mode === "video" ? "วิดีโอพิธีกร" : "ภาพนิ่ง") + " อัตโนมัติ"}</p>
          {episode.versions.length ? <div className="take-list">{[...episode.versions].reverse().map(take => {
            const prev = episode.versions[take.number - 2];
            const changed = prev ? take.lines.filter(line => !prev.lines.includes(line)) : [];
            const posted = episode.posts.filter(post => post.version === take.id);
            const selected = take.id === episode.selectedVersion;
            return <div key={take.id} className={"take" + (selected ? " selected" : "") + (shown?.id === take.id ? " previewing" : "")}>
              <button className="take-thumb" aria-label={"ดูรอบ " + take.number} onClick={() => setPreview(take.id)}><img src={take.posterUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /></button>
              <div>
                <div className="take-head"><strong>รอบ {take.number}</strong><ModeBadge mode={take.mode} />{selected && <span className="main-slot"><Star size={12} fill="currentColor" /> รอบที่จะลง</span>}
                  {posted.map((post, index) => <PlatformBadge key={index} platform={post.platform} compact />)}</div>
                <p className="small muted">{takeTime(take.rendered_at)}{take.duration ? " · " + take.duration + " วิ" : ""}</p>
                {prev ? changed.length ? <ul className="take-changes">{changed.map((line, index) => <li key={index}>แก้: {line}</li>)}</ul> : <p className="small muted">บทพูดเหมือนรอบก่อน</p> : <p className="small muted">รอบแรกที่เก็บไว้</p>}
                <div className="take-actions">
                  <Button variant="outline" onClick={() => setPreview(take.id)}><Play size={15} /> ดู</Button>
                  {!selected && <Button onClick={async () => { await selectVersion(id, take.id); setPreview(null); toast.success("ใช้รอบ " + take.number + " ลงโพสต์"); }}><Star size={15} /> ใช้รอบนี้ลง</Button>}
                  {!selected && !posted.length && <Button variant="ghost" size="icon" aria-label={"ลบรอบ " + take.number} onClick={() => setAction({ kind: "drop-take", take })}><Trash2 size={16} /></Button>}
                </div>
              </div>
            </div>;
          })}</div> : <Empty>ยังไม่มีประวัติ ระบบจะเก็บทุกครั้งที่ render ใหม่</Empty>}
        </TabsContent>
        <TabsContent value="posts" className="tab-panel">
          <div className="post-section-heading"><h2>ประวัติการลงโพสต์</h2><Button onClick={() => setAction({ kind: "add" })}><Plus size={16} /> เพิ่มโพสต์</Button></div>
          {episode.posts.length ? <div className="stack">{episode.posts.map((post, index) => <div className="post-entry" key={index}>
            <div className="post-entry-heading"><PlatformBadge platform={post.platform} /><span className="muted small">{thaiShortDate(post.date)} · {post.time}{post.version ? " · รอบ " + (episode.versions.find(v => v.id === post.version)?.number ?? "?") : ""}</span></div>
            <p className="small muted">ยอดดู {post.views.toLocaleString("th-TH")} · ถูกใจ {post.likes.toLocaleString("th-TH")} · บันทึก {post.saves.toLocaleString("th-TH")}</p>
            <div className="post-entry-actions">{post.url && <PostLink url={post.url}><ExternalLink size={15} /> เปิดโพสต์</PostLink>}
              <Button variant="outline" onClick={() => setAction({ kind: "edit", index, post })}><Pencil size={15} /> แก้ไขสถิติ</Button>
              <Button variant="ghost" size="icon" aria-label="ลบโพสต์" onClick={() => setAction({ kind: "delete", index, post })}><Trash2 size={17} /></Button>
            </div>
          </div>)}</div> : <Empty>ยังไม่มีประวัติการลงโพสต์</Empty>}
        </TabsContent>
      </Tabs></Card>
    </div>
    {action?.kind === "add" && <PostForm date={date} time={schedule.main_slot} close={close} save={async post => {
      await addPost(id, post); close(); toast.success("บันทึกแล้ว");
    }} />}
    {action?.kind === "edit" && <Modal open close={close} title="แก้ไขสถิติโพสต์"><form className="stack" onSubmit={async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const stats = { views: Number(form.get("views")), likes: Number(form.get("likes")), saves: Number(form.get("saves")) };
      await updateStats(id, action.index, stats);
      close(); toast.success("บันทึกสถิติแล้ว");
    }}>
      <label>ยอดดู<input required name="views" type="number" min="0" defaultValue={action.post.views} /></label>
      <label>ถูกใจ<input required name="likes" type="number" min="0" defaultValue={action.post.likes} /></label>
      <label>บันทึก<input required name="saves" type="number" min="0" defaultValue={action.post.saves} /></label>
      <div className="modal-actions"><Button type="button" variant="outline" onClick={close}>ยกเลิก</Button><Button type="submit">บันทึก</Button></div>
    </form></Modal>}
    {action?.kind === "drop-take" && <Confirm open close={close} destructive title={"ลบรอบ " + action.take.number + "?"} description="ไฟล์วิดีโอของรอบนี้จะถูกลบออกจากเครื่อง กู้คืนไม่ได้" confirmLabel="ลบรอบนี้" action={async () => {
      await deleteVersion(id, action.take.id); if (preview === action.take.id) setPreview(null); toast.success("ลบรอบแล้ว");
    }} />}
    {action?.kind === "delete" && <Confirm open close={close} destructive title="ลบบันทึกการลงโพสต์?" description="รายการนี้จะถูกนำออกจากประวัติของคลิป" confirmLabel="ลบรายการ" action={async () => {
      await removePost(id, action.index); toast.success("ลบบันทึกแล้ว");
    }} />}
  </>;
}

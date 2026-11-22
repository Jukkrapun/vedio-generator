"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink, ListRestart, Pencil, Plus, Trash2, WandSparkles } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import type { PublishField } from "@/lib/publish";
import { thaiShortDate } from "@/lib/time";
import { platforms, type EpisodeDetail, type Platform, type Post } from "@/lib/types";
import { CopyButton, Empty, EpisodeStatusBadge, PlatformBadge, PostLink, SeriesChip, VideoPlayer } from "./common";
import { useOps } from "./ops-provider";
import { PostForm } from "./post-form";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Confirm, Modal } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type Action = { kind: "add" } | { kind: "edit" | "delete"; index: number; post: Post };

export function EpisodeScreen({ id, initial, date, fields }: { id: string; initial: EpisodeDetail | null; date: string; fields: Record<Platform, PublishField[]> }) {
  const { episodes, created, updatePosts, enqueue, schedule } = useOps();
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const details = initial ?? created[id];
  const episode = episodes.find(item => item.id === id);
  if (!details || !episode) return <><Button asChild variant="ghost"><Link href="/episodes"><ArrowLeft size={16} /> กลับไปที่คลิป</Link></Button><Empty>ไม่พบคลิปนี้</Empty></>;
  const close = () => setAction(null);
  function queue(type: "produce" | "catalog") {
    const job = enqueue(type, type === "produce" ? { episode: "content/" + episode!.series + "/episodes/" + episode!.slug } : { series: episode!.series }, type === "produce" ? id : undefined);
    toast.success("เพิ่มงานเข้าคิวแล้ว");
    router.push("/jobs/" + job);
  }
  const produce = <Button onClick={() => queue("produce")}><WandSparkles size={16} /> ผลิตคลิป</Button>;
  return <>
    <Link className="back-link" href="/episodes"><ArrowLeft size={16} /> คลิปทั้งหมด</Link>
    <header className="page-heading"><div><div className="tag-row"><SeriesChip series={episode.series} /><EpisodeStatusBadge status={episode.status} /></div><h1>{episode.title}</h1></div>
      <div className="heading-actions">{produce}<Button variant="outline" onClick={() => queue("catalog")}><ListRestart size={16} /> สร้างแค็ตตาล็อกใหม่</Button></div>
    </header>
    <div className="detail-grid">
      <div className="video-panel"><VideoPlayer episode={episode} />{!episode.videoUrl && produce}</div>
      <Card className="detail-card"><Tabs defaultValue="script">
        <TabsList aria-label="รายละเอียดคลิป"><TabsTrigger value="script">สคริปต์</TabsTrigger><TabsTrigger value="publish">ข้อมูลลงคลิป</TabsTrigger><TabsTrigger value="posts">โพสต์ ({episode.posts.length})</TabsTrigger></TabsList>
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
        <TabsContent value="posts" className="tab-panel">
          <div className="post-section-heading"><h2>ประวัติการลงโพสต์</h2><Button onClick={() => setAction({ kind: "add" })}><Plus size={16} /> เพิ่มโพสต์</Button></div>
          {episode.posts.length ? <div className="stack">{episode.posts.map((post, index) => <div className="post-entry" key={index}>
            <div className="post-entry-heading"><PlatformBadge platform={post.platform} /><span className="muted small">{thaiShortDate(post.date)} · {post.time}</span></div>
            <p className="small muted">ยอดดู {post.views.toLocaleString("th-TH")} · ถูกใจ {post.likes.toLocaleString("th-TH")} · บันทึก {post.saves.toLocaleString("th-TH")}</p>
            <div className="post-entry-actions">{post.url && <PostLink url={post.url}><ExternalLink size={15} /> เปิดโพสต์</PostLink>}
              <Button variant="outline" onClick={() => setAction({ kind: "edit", index, post })}><Pencil size={15} /> แก้ไขสถิติ</Button>
              <Button variant="ghost" size="icon" aria-label="ลบโพสต์" onClick={() => setAction({ kind: "delete", index, post })}><Trash2 size={17} /></Button>
            </div>
          </div>)}</div> : <Empty>ยังไม่มีประวัติการลงโพสต์</Empty>}
        </TabsContent>
      </Tabs></Card>
    </div>
    {action?.kind === "add" && <PostForm date={date} time={schedule.main_slot} close={close} save={post => {
      updatePosts(id, posts => [...posts, post]); close(); toast.success("บันทึกแล้ว");
    }} />}
    {action?.kind === "edit" && <Modal open close={close} title="แก้ไขสถิติโพสต์"><form className="stack" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const stats = { views: Number(form.get("views")), likes: Number(form.get("likes")), saves: Number(form.get("saves")) };
      updatePosts(id, posts => posts.map((post, index) => index === action.index ? { ...post, ...stats } : post));
      close(); toast.success("บันทึกสถิติแล้ว");
    }}>
      <label>ยอดดู<input required name="views" type="number" min="0" defaultValue={action.post.views} /></label>
      <label>ถูกใจ<input required name="likes" type="number" min="0" defaultValue={action.post.likes} /></label>
      <label>บันทึก<input required name="saves" type="number" min="0" defaultValue={action.post.saves} /></label>
      <div className="modal-actions"><Button type="button" variant="outline" onClick={close}>ยกเลิก</Button><Button type="submit">บันทึก</Button></div>
    </form></Modal>}
    {action?.kind === "delete" && <Confirm open close={close} destructive title="ลบบันทึกการลงโพสต์?" description="รายการนี้จะถูกนำออกจากประวัติของคลิป" confirmLabel="ลบรายการ" action={() => {
      updatePosts(id, posts => posts.filter((_, index) => index !== action.index)); toast.success("ลบบันทึกแล้ว");
    }} />}
  </>;
}

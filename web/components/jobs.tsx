"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Terminal, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { duration } from "@/lib/time";
import type { Job, Mode } from "@/lib/types";
import { Empty, episodeHref, JobBadge, jobLabels, seriesNames } from "./common";
import { useJob, useOps } from "./ops-provider";
import { AsyncForm, Button } from "./ui/button";
import { Card } from "./ui/card";
import { Confirm } from "./ui/dialog";

function jobTarget(job: Job, title?: string) {
  return title ?? String(job.args.series ?? job.args.episode ?? job.args.character ?? "—");
}

export function JobsScreen({ series }: { series: string[] }) {
  const { jobs, episodes, newEpisode } = useOps();
  const router = useRouter();
  return <>
    <header className="page-heading"><div><h1>สร้างตอนและงานผลิต</h1><p className="muted">เปิดตอนใหม่และติดตามคิวการผลิตคลิป</p></div></header>
    <div className="jobs-grid">
      <Card className="section-card"><div className="subheading-icon"><Plus size={20} /><h2>สร้างตอนใหม่</h2></div>
        <AsyncForm className="stack" onSubmit={async event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const id = await newEpisode(String(form.get("series")), String(form.get("slug")), form.get("mode") as Mode);
          toast.success("เพิ่มงานสร้างตอนแล้ว");
          router.push("/jobs/" + id);
        }}>
          <label>ซีรีส์<select name="series" required>{series.map(key => <option key={key} value={key}>{seriesNames[key] ?? key}</option>)}</select></label>
          <label>ชื่อโฟลเดอร์<input name="slug" placeholder="เช่น late-night-thoughts" pattern="[a-z0-9]+(-[a-z0-9]+)*" required aria-describedby="slug-help" /><span id="slug-help" className="small muted">ใช้ตัวอักษรอังกฤษพิมพ์เล็กหรือตัวเลข คั่นคำด้วยขีดกลาง</span></label>
          <label>รูปแบบ<select name="mode"><option value="image">ภาพนิ่ง</option><option value="video">วิดีโอพิธีกร</option></select></label>
          <Button type="submit"><Plus size={17} /> สร้างตอน</Button>
        </AsyncForm>
      </Card>
      <section className="jobs-list"><div className="section-heading"><div><h2>คิวงาน</h2><p className="muted">ประมวลผลทีละงาน</p></div><Workflow size={22} /></div>
        {jobs.length ? jobs.map(job => <Link key={job.id} className="job-row card" href={"/jobs/" + job.id}>
          <div><strong>{jobLabels[job.type]}</strong><p className="muted small">{jobTarget(job, episodes.find(episode => episode.id === job.episodeId)?.title)}</p></div>
          <div className="job-row-end"><JobBadge status={job.status} /><span className="small muted">{duration(job.started_at, job.finished_at)}</span></div><ArrowRight size={17} />
        </Link>) : <Empty>ยังไม่มีงานในคิว</Empty>}
      </section>
    </div>
  </>;
}

function JobLog({ lines }: { lines: string[] }) {
  const log = useRef<HTMLPreElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [lines]);
  return <pre ref={log} role="log" aria-live="polite" tabIndex={0} className="job-log">{lines.length ? lines.join("\n") : "กำลังรอข้อความจากงาน"}</pre>;
}

export function JobScreen({ id, initial }: { id: string; initial: Job | null }) {
  const { episodes, cancelJob } = useOps();
  const [cancel, setCancel] = useState(false);
  const job = useJob(id, initial);
  const episode = episodes.find(item => item.id === job?.episodeId);
  return <>
    <Link className="back-link" href="/jobs"><ArrowLeft size={16} /> คิวงาน</Link>
    {!job ? <Empty>ไม่พบงานนี้</Empty> : <>
      <header className="page-heading"><div><JobBadge status={job.status} /><h1>{jobLabels[job.type]}</h1><p className="muted">{jobTarget(job, episode?.title)}</p></div>
        <div className="heading-actions">{episode && (job.type !== "new_episode" || job.status === "done") && <Button asChild variant="outline"><Link href={episodeHref(episode)}>เปิดคลิป <ArrowRight size={16} /></Link></Button>}
          {job.status === "running" && <Button variant="outline" onClick={() => setCancel(true)}>ยกเลิกงาน</Button>}</div>
      </header>
      <Card className="section-card"><div className="section-heading"><div className="subheading-icon"><Terminal size={21} /><h2>บันทึกการทำงาน</h2></div><span className="muted small">{duration(job.started_at, job.finished_at)}</span></div>
        <JobLog lines={job.log} />
      </Card>
      {cancel && <Confirm open title="ยกเลิกงานนี้?" description="งานที่กำลังทำอยู่จะถูกหยุด (ไฟล์ที่ทำเสร็จแล้วยังอยู่ใน cache)" confirmLabel="ยืนยันยกเลิก" destructive close={() => setCancel(false)}
        action={async () => { await cancelJob(id); toast.success("ส่งคำสั่งยกเลิกแล้ว"); }} />}
    </>}
  </>;
}

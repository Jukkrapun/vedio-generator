"use client";
/* Production pipeline UI: order cards, order detail, per-stage review (docs/ops-dashboard/PIPELINE.md). */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Ban, Check, CircleAlert, FastForward, ImageIcon, Loader2, Mic, Pencil, RefreshCw, RotateCcw, ScrollText, Send, Sparkles, Undo2, Video } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { duration } from "@/lib/time";
import { stages, type SubtitlePosition, type Episode, type EpisodeDetail, type Job, type Order, type Stage, type WorkerInfo } from "@/lib/types";
import { Empty, JobBadge, SeriesChip, episodeHref, jobLabels, seriesNames } from "./common";
import { api, fail, useJob, useOps } from "./ops-provider";
import { AsyncForm, Button } from "./ui/button";
import { Badge, Card } from "./ui/card";
import { Confirm, Modal } from "./ui/dialog";

// ---- stage state ------------------------------------------------------------------
type StepKey = typeof stages[number];
const stageLabels: Record<StepKey, string> = { script: "บท", images: "ภาพ", voice: "เสียง", render: "เรนเดอร์" };
const stageIcons = { script: ScrollText, images: ImageIcon, voice: Mic, render: Video };
// jobs that produce a stage's material (so a running one = "busy" for that stage)
const stageJobs: Record<StepKey, Job["type"][]> = {
  script: ["revise", "claude"], images: ["images", "regen_image", "produce"], voice: ["voice", "regen_voice", "produce"], render: ["render", "produce"],
};
export type StepState = "done" | "review" | "busy" | "failed" | "todo" | "dropped";

export function episodeJobs(jobs: Job[], id: string) { return jobs.filter(job => job.episodeId === id); }

/** Where an episode is: current stage + whether it waits for the user, is being made, or failed. */
export function stageStatus(episode: Episode, jobs: Job[]): { stage: Stage; state: StepState; job?: Job } {
  const stage = episode.review?.stage ?? "done";
  if (stage === "done" || stage === "dropped") return { stage, state: stage === "done" ? "done" : "dropped" };
  const latest = episodeJobs(jobs, episode.id).filter(job => stageJobs[stage].includes(job.type))[0];
  if (latest && (latest.status === "queued" || latest.status === "running")) return { stage, state: "busy", job: latest };
  if (latest && latest.status === "failed") return { stage, state: "failed", job: latest };
  return { stage, state: "review", job: latest };
}

export function Stepper({ episode, jobs }: { episode: Episode; jobs: Job[] }) {
  const { stage, state } = stageStatus(episode, jobs);
  const current = stages.indexOf(stage as StepKey);
  return <ol className="stepper" aria-label="ขั้นตอนการผลิต">
    {stages.map((key, index) => {
      const Icon = stageIcons[key];
      const step: StepState = stage === "done" ? "done" : stage === "dropped" ? "dropped" : index < current ? "done" : index === current ? state : "todo";
      return <li key={key} className={"step step-" + step} title={stageLabels[key]}>
        <span className="step-dot">{step === "done" ? <Check size={13} /> : step === "busy" ? <Loader2 size={13} className="spin" /> : step === "failed" ? <CircleAlert size={13} /> : <Icon size={13} />}</span>
        <span className="step-label">{stageLabels[key]}</span>
      </li>;
    })}
  </ol>;
}

export function StageBadge({ episode, jobs }: { episode: Episode; jobs: Job[] }) {
  const { stage, state } = stageStatus(episode, jobs);
  if (state === "done") return <Badge className="done">พร้อมลง</Badge>;
  if (state === "dropped") return <Badge>ทิ้งแล้ว</Badge>;
  const name = stageLabels[stage as StepKey];
  if (state === "busy") return <Badge className="running">กำลังทำ{name}</Badge>;
  if (state === "failed") return <Badge className="failed">{name}ไม่สำเร็จ</Badge>;
  return <Badge className="due">รอตรวจ{name}</Badge>;
}

// ---- worker banner ----------------------------------------------------------------
export function WorkerBanner({ need }: { need?: "claude" | "codex" }) {
  const [info, setInfo] = useState<WorkerInfo | undefined>(undefined);
  useEffect(() => {
    let stopped = false;
    const tick = () => api<WorkerInfo>("/api/worker").then(next => { if (!stopped) setInfo(next); }).catch(() => undefined);
    tick();
    const timer = window.setInterval(tick, 10_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);
  if (info === undefined) return null;
  const missing = !info?.online ? "offline" : need && !info[need] ? need : null;
  if (!missing) return <p className="small muted worker-ok"><span className="online-dot" /> worker ทำงานอยู่บน{info!.kind === "host" ? "เครื่อง" : " Docker"}</p>;
  return <Card className="worker-warn"><CircleAlert size={18} /><div>
    <strong>{missing === "offline" ? "worker ไม่ได้ทำงาน" : `worker ตอนนี้ใช้ ${missing} ไม่ได้ (รันอยู่ใน Docker)`}</strong>
    <p className="small muted">งานเขียนบทและสร้างภาพต้องใช้ worker บนเครื่อง: เปิด PowerShell ที่โฟลเดอร์โปรเจกต์แล้วรัน <code>powershell -ExecutionPolicy Bypass -File ops/start-worker.ps1</code></p>
  </div></Card>;
}

// ---- orders list + new order --------------------------------------------------------
type Template = { id: string; title: string; body: string; fields: { key: string; label: string; example?: string; options: string[] | null; series?: boolean }[] };

function useOrders(initial: Order[]) {
  const [orders, setOrders] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(() => api<Order[]>("/api/orders").then(setOrders).catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, []);
  return [orders, setOrders] as const;
}

function orderProgress(order: Order, episodes: Episode[], jobs: Job[]) {
  const items = order.episodes.map(id => episodes.find(e => e.id === id)).filter((e): e is Episode => !!e);
  const states = items.map(e => stageStatus(e, jobs).state);
  return { items, done: states.filter(s => s === "done").length, review: states.filter(s => s === "review" || s === "failed").length, busy: states.filter(s => s === "busy").length, dropped: states.filter(s => s === "dropped").length };
}

export function OrdersScreen({ initial, templates }: { initial: Order[]; templates: Template[] }) {
  const { episodes, jobs } = useOps();
  const [orders, setOrders] = useOrders(initial);
  const [creating, setCreating] = useState(false);
  return <>
    <header className="page-heading"><div><h1>งาน</h1><p className="muted">สั่งทำคลิปจาก PROMPTS.md แล้วตรวจทีละขั้น</p></div>
      <div className="heading-actions"><Button onClick={() => setCreating(true)}><Sparkles size={16} /> สั่งงานใหม่</Button></div></header>
    <WorkerBanner need="claude" />
    {orders.length ? <div className="order-grid">{orders.map(order => {
      const job = jobs.find(j => j.id === order.job_id);
      const p = orderProgress(order, episodes, jobs);
      const total = p.items.length - p.dropped;
      return <Link key={order.id} href={"/orders/" + order.id} className="card order-card">
        <div className="order-top"><strong>{order.title}</strong><ArrowRight size={17} /></div>
        <div className="tag-row">{order.series && <SeriesChip series={order.series} />}<span className="small muted">{new Date(order.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
        {!p.items.length ? <p className="small muted">{job?.status === "failed" ? "Claude เขียนบทไม่สำเร็จ — กดดู log" : job?.status === "done" ? "ไม่มีตอนใหม่" : "Claude กำลังเขียนบท…"}</p> : <>
          <progress value={p.done} max={total || 1} aria-label="ความคืบหน้า" />
          <p className="small"><strong>{p.done}/{total}</strong> พร้อมลง{p.review ? ` · ${p.review} รอตรวจ` : ""}{p.busy ? ` · ${p.busy} กำลังทำ` : ""}{p.dropped ? ` · ทิ้ง ${p.dropped}` : ""}</p>
        </>}
      </Link>;
    })}</div> : <Empty>ยังไม่มีงาน กด "สั่งงานใหม่" เพื่อเริ่ม</Empty>}
    <UnreviewedDrafts />
    <SystemJobs />
    {creating && <NewOrder templates={templates} close={() => setCreating(false)} created={order => setOrders(current => [order, ...current])} />}
  </>;
}

function NewOrder({ templates, close, created }: { templates: Template[]; close: () => void; created: (order: Order) => void }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const template = templates.find(t => t.id === templateId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<string | null>(null);
  const filled = useMemo(() => template ? template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const field = template.fields.find(f => f.key === key);
    return values[key] ?? (field?.series ? field.options?.[0] ?? "" : field?.options?.length === 1 ? field.options[0] : "");
  }) : "", [template, values]);
  const prompt = edited ?? filled;
  if (!template) return <Modal open close={close} title="สั่งงานใหม่"><Empty>ไม่พบ template ใน PROMPTS.md</Empty></Modal>;
  const series = values.series ?? template.fields.find(f => f.series)?.options?.[0] ?? "";
  return <Modal open close={close} title="สั่งงานใหม่" description="เลือก template จาก PROMPTS.md แล้วกรอกช่องว่าง Claude จะเขียนบทอย่างเดียว ภาพ/เสียง/เรนเดอร์ทำหลังคุณอนุมัติ">
    <AsyncForm className="stack" onSubmit={async event => {
      event.preventDefault();
      const order = await api<Order>("/api/orders", { method: "POST", json: { template: template.id, prompt, series, title: template.title + (series ? " · " + (seriesNames[series] ?? series) : "") } }).catch(fail);
      created(order); close(); toast.success("ส่งให้ Claude แล้ว");
      router.push("/orders/" + order.id);
    }}>
      <label>Template<select value={templateId} onChange={event => { setTemplateId(event.target.value); setValues({}); setEdited(null); }}>
        {templates.map(t => <option key={t.id} value={t.id}>{t.id}. {t.title}</option>)}</select></label>
      {template.fields.map(field => <label key={field.key}>{field.series ? "ซีรีส์" : field.label}
        {field.series ? <select value={values[field.key] ?? field.options![0]} onChange={event => { setValues({ ...values, [field.key]: event.target.value }); setEdited(null); }}>
          {field.options!.map(option => <option key={option} value={option}>{seriesNames[option] ?? option}</option>)}</select>
          : <><input list={field.options ? "opts-" + field.key : undefined} value={values[field.key] ?? (field.options?.length === 1 ? field.options[0] : "")} placeholder={"เช่น " + (field.example || field.label)}
              onChange={event => { setValues({ ...values, [field.key]: event.target.value }); setEdited(null); }} />
            {field.options && <datalist id={"opts-" + field.key}>{field.options.map(option => <option key={option} value={option} />)}</datalist>}</>}
      </label>)}
      <label>Prompt ที่จะส่ง <span className="small muted">(แก้ได้)</span><textarea rows={8} value={prompt} onChange={event => setEdited(event.target.value)} /></label>
      <div className="modal-actions"><Button type="button" variant="outline" onClick={close}>ยกเลิก</Button><Button type="submit"><Send size={16} /> ส่งให้ Claude</Button></div>
    </AsyncForm>
  </Modal>;
}

/** Episodes written outside the web (chat / CLI) that are not rendered and have no review stage yet. */
function UnreviewedDrafts() {
  const { episodes } = useOps();
  const drafts = episodes.filter(e => !e.review && e.status === "draft");
  if (!drafts.length) return null;
  return <Card className="section-card unreviewed">
    <div className="section-heading"><div><h2>ตอนที่สร้างนอกเว็บ ยังไม่ได้ตรวจ ({drafts.length})</h2><p className="small muted">เขียนในแชทหรือรันเอง ยังไม่ได้เรนเดอร์ กดเพื่อเข้าขั้นตรวจ</p></div></div>
    <div className="order-episodes">{drafts.map(episode => <Link key={episode.id} href={"/review/" + episode.id} className="order-episode">
      <div><strong>{episode.slug.split("-")[0]} · {episode.title}</strong><div className="tag-row"><SeriesChip series={episode.series} /></div></div><ArrowRight size={17} />
    </Link>)}</div>
  </Card>;
}

function SystemJobs() {
  const { jobs } = useOps();
  const [open, setOpen] = useState(false);
  const visible = jobs.filter(job => job.type !== "poster");
  return <section className="system-jobs">
    <button className="link-button" onClick={() => setOpen(!open)}>{open ? "ซ่อน" : "ดู"}คิวงานทั้งหมด ({visible.length})</button>
    {open && <div className="stack">{visible.map(job => <Link key={job.id} className="job-row card" href={"/jobs/" + job.id}>
      <div><strong>{jobLabels[job.type]}</strong><p className="muted small">{job.episodeId ?? String(job.args.series ?? "")}</p></div>
      <div className="job-row-end"><JobBadge status={job.status} /><span className="small muted">{duration(job.started_at, job.finished_at)}</span></div><ArrowRight size={17} />
    </Link>)}</div>}
  </section>;
}

// ---- order detail -------------------------------------------------------------------
export function OrderScreen({ initial }: { initial: Order }) {
  const { episodes, jobs } = useOps();
  const [order, setOrder] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(() => api<Order>("/api/orders/" + initial.id).then(setOrder).catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [initial.id]);
  const claude = useJob(order.job_id, jobs.find(j => j.id === order.job_id) ?? null);
  const items = order.episodes.map(id => episodes.find(e => e.id === id)).filter((e): e is Episode => !!e);
  const [showLog, setShowLog] = useState(false);
  const writing = claude && (claude.status === "queued" || claude.status === "running");
  return <>
    <Link className="back-link" href="/jobs"><ArrowLeft size={16} /> งานทั้งหมด</Link>
    <header className="page-heading"><div><div className="tag-row">{order.series && <SeriesChip series={order.series} />}{claude && <JobBadge status={claude.status} />}</div><h1>{order.title}</h1></div></header>
    <WorkerBanner need={writing ? "claude" : "codex"} />
    <Card className="section-card">
      <div className="section-heading"><h2>ตอนในงานนี้ ({items.length})</h2></div>
      {items.length ? <div className="order-episodes">{items.map(episode => <Link key={episode.id} href={"/review/" + episode.id} className="order-episode">
        <div><strong>{episode.slug.split("-")[0]} · {episode.title}</strong><div className="tag-row"><StageBadge episode={episode} jobs={jobs} /></div></div>
        <Stepper episode={episode} jobs={jobs} /><ArrowRight size={17} />
      </Link>)}</div> : <Empty>{writing ? "Claude กำลังเขียนบท… ตอนจะขึ้นที่นี่เมื่อเขียนเสร็จ" : "ยังไม่มีตอนจากงานนี้"}</Empty>}
    </Card>
    <Card className="section-card">
      <button className="link-button" onClick={() => setShowLog(!showLog)}>{showLog ? "ซ่อน" : "ดู"} prompt และ log ของ Claude</button>
      {showLog && <><pre className="job-log">{order.prompt}</pre><pre className="job-log">{claude?.log.join("\n") || "ยังไม่มี log"}</pre></>}
    </Card>
  </>;
}

// ---- stage review -------------------------------------------------------------------
export function ReviewScreen({ id, initial }: { id: string; initial: EpisodeDetail }) {
  const { episodes, jobs, enqueue, refreshEpisodes } = useOps();
  const [detail, setDetail] = useState(initial);
  const episode = episodes.find(e => e.id === id) ?? initial;
  const { stage, state, job } = stageStatus(episode, jobs);
  const stamp = episodeJobs(jobs, id).find(j => j.finished_at)?.finished_at ?? "";
  const reload = useCallback(() => api<EpisodeDetail>("/api/episodes/" + id).then(setDetail).catch(() => undefined), [id]);
  useEffect(() => { void reload(); }, [reload, stamp, episode.review?.stage]);
  const [confirm, setConfirm] = useState<null | "all" | "drop">(null);
  const asset = (file: string) => `/api/asset/${id}?f=${encodeURIComponent(file)}&t=${encodeURIComponent(stamp)}`;

  async function act(action: "approve" | "all" | "drop" | "restore" | "back" | "adopt", target?: Stage) {
    await api("/api/episodes/" + id + "/stage", { method: "POST", json: { action, target } }).catch(fail);
    await refreshEpisodes();
    toast.success(action === "approve" ? "อนุมัติแล้ว" : action === "drop" ? "ทิ้งตอนนี้แล้ว" : action === "adopt" ? "เข้าขั้นตรวจแล้ว" : "อัปเดตแล้ว");
  }
  const orderId = episode.review?.order;
  const step = stage as StepKey;
  const story = episode.mode === "story";
  const nextLabel: Record<StepKey, string> = { script: "อนุมัติบท → สร้างภาพ", images: story ? "อนุมัติภาพ → ทำเสียง + เรนเดอร์ (ไทย/อังกฤษ)" : "อนุมัติภาพ → ทำเสียง", voice: "อนุมัติเสียง → เรนเดอร์", render: "อนุมัติ → เข้าคิวลงคลิป" };

  return <>
    <Link className="back-link" href={orderId ? "/orders/" + orderId : "/jobs"}><ArrowLeft size={16} /> {orderId ? "กลับไปที่งาน" : "งานทั้งหมด"}</Link>
    <header className="page-heading"><div><div className="tag-row"><SeriesChip series={episode.series} /><StageBadge episode={episode} jobs={jobs} /></div><h1>{episode.slug.split("-")[0]} · {detail.title}</h1></div>
      <div className="heading-actions"><Button asChild variant="outline"><Link href={episodeHref(episode)}>หน้าคลิป</Link></Button></div></header>
    <Stepper episode={episode} jobs={jobs} />
    {(state === "busy" || state === "failed") && job && <Card className={"stage-status " + state}>
      {state === "busy" ? <Loader2 size={18} className="spin" /> : <CircleAlert size={18} />}
      <div><strong>{state === "busy" ? jobLabels[job.type] + " กำลังทำงาน…" : jobLabels[job.type] + " ไม่สำเร็จ"}</strong>
        <p className="small muted"><Link href={"/jobs/" + job.id}>ดู log</Link>{state === "failed" && " · แก้แล้วลองใหม่ได้ด้วยปุ่มด้านล่าง"}</p></div>
      {state === "failed" && <Button variant="outline" onClick={async () => { await enqueue(job.type, job.args); toast.success("ลองใหม่แล้ว"); }}><RotateCcw size={15} /> ลองใหม่</Button>}
    </Card>}
    {stage === "dropped" && <Card className="stage-status"><Ban size={18} /><div><strong>ตอนนี้ถูกทิ้งแล้ว</strong></div><Button variant="outline" onClick={() => act("restore")}><Undo2 size={15} /> เอากลับมา</Button></Card>}
    {!episode.review && <Card className="stage-status"><ScrollText size={18} /><div><strong>ตอนนี้สร้างนอกเว็บ ยังไม่อยู่ในขั้นตรวจ</strong><p className="small muted">กด "เริ่มตรวจ" ระบบจะดูไฟล์ที่มี (บท ภาพ เสียง คลิป) แล้วพาไปขั้นที่ต้องตรวจต่อ</p></div><Button onClick={() => act("adopt")}><Check size={15} /> เริ่มตรวจ</Button></Card>}
    {episode.review && stage === "done" && <Card className="stage-status done"><Check size={18} /><div><strong>ผ่านครบทุกขั้นแล้ว อยู่ในคิวลงคลิป</strong><p className="small muted">เลือกรอบที่จะลงได้ในแท็บประวัติของหน้าคลิป</p></div></Card>}

    {step === "script" && <ScriptReview id={id} detail={detail} reload={reload} busy={state === "busy"} asset={asset} />}
    {step === "images" && <ImagesReview id={id} detail={detail} asset={asset} busy={state === "busy"} />}
    {step === "voice" && <VoiceReview id={id} detail={detail} asset={asset} busy={state === "busy"} />}
    {step === "render" && <RenderReview episode={episode} busy={state === "busy"} />}

    {episode.review && stages.includes(step) && <div className="review-actions">
      <Button disabled={state === "busy"} onClick={() => act("approve")}><Check size={16} /> {nextLabel[step]}</Button>
      {step !== "render" && <Button variant="outline" disabled={state === "busy"} onClick={() => setConfirm("all")}><FastForward size={16} /> อนุมัติที่เหลือทั้งหมด</Button>}
      {stages.indexOf(step) > 0 && <Button variant="ghost" disabled={state === "busy"} onClick={() => act("back", stages[stages.indexOf(step) - 1])}><Undo2 size={15} /> ย้อนไปขั้นก่อน</Button>}
      <Button variant="ghost" onClick={() => setConfirm("drop")}><Ban size={15} /> ทิ้งตอนนี้</Button>
    </div>}
    {confirm === "all" && <Confirm open close={() => setConfirm(null)} title="ทำที่เหลือทั้งหมดรวดเดียว?" description="สร้างภาพที่ยังขาด ทำเสียง แล้วเรนเดอร์ต่อเลย (ใช้โควตา Codex และเครดิตเสียง) จากนั้นค่อยตรวจคลิปสุดท้าย" confirmLabel="ทำเลย" action={() => act("all")} />}
    {confirm === "drop" && <Confirm open destructive close={() => setConfirm(null)} title="ทิ้งตอนนี้?" description="ตอนนี้จะไม่เข้าคิวลงคลิป ไฟล์ยังอยู่ และเอากลับมาได้" confirmLabel="ทิ้ง" action={() => act("drop")} />}
  </>;
}

function ScriptReview({ id, detail, reload, busy, asset }: { id: string; detail: EpisodeDetail; reload: () => Promise<unknown>; busy: boolean; asset: (f: string) => string }) {
  const { enqueue } = useOps();
  const [draft, setDraft] = useState(detail);
  const [publish, setPublish] = useState(detail.publish);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"script" | "publish">("script");
  const [showPrompts, setShowPrompts] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => { if (!dirty) { setDraft(detail); setPublish(detail.publish); } }, [detail, dirty]);
  const story = detail.mode === "story"; // story text is {th, en}: read-only here, ask Claude to change it
  const edit = (segId: string, patch: Partial<EpisodeDetail["segments"][number]>) => { setDirty(true); setDraft(d => ({ ...d, segments: d.segments.map(s => s.id === segId ? { ...s, ...patch } : s) })); };
  async function save() {
    const saved = await api("/api/episodes/" + id + "/script", { method: "PATCH", json: { title: draft.title, publish, segments: draft.segments.map(s => ({ id: s.id, ...(story ? {} : { text: s.text }), cards: s.cards, image_prompt_th: s.image_prompt_th })) } }).catch(fail) as { translating?: string[] };
    setDirty(false); setEditing(false); await reload();
    toast.success(saved.translating?.length ? "บันทึกแล้ว · Claude กำลังแปล prompt ภาพเป็นอังกฤษ" : "บันทึกบทแล้ว");
  }
  const cancel = () => { setDirty(false); setEditing(false); setDraft(detail); setPublish(detail.publish); };
  const spoken = draft.segments.filter(s => !s.skip);
  const chars = spoken.reduce((n, s) => n + s.text.replace(/\[[^\]]*\]/g, "").length, 0);

  return <div className="stack">
    <Card className="section-card script-sheet">
      <div className="script-toolbar">
        <div className="segmented" role="tablist">
          <button aria-pressed={view === "script"} onClick={() => setView("script")}>บทพูด ({spoken.length} ช่วง)</button>
          <button aria-pressed={view === "publish"} onClick={() => setView("publish")}>แคปชัน / publish</button>
        </div>
        <div className="script-tools">
          {view === "script" && <label className="checkbox small"><input type="checkbox" checked={showPrompts} onChange={event => setShowPrompts(event.target.checked)} />แสดง prompt ภาพ</label>}
          {!editing ? <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} /> แก้ไข</Button>
            : <><Button variant="ghost" onClick={cancel}>ยกเลิก</Button><Button disabled={!dirty} onClick={save}>บันทึก</Button></>}
        </div>
      </div>
      <p className="small muted">~{chars.toLocaleString("th-TH")} ตัวอักษรที่พูด{story ? " · เรื่องยาว: แก้บทพูดผ่าน \"ให้ Claude แก้บท\" ด้านล่าง" : ""}</p>

      {view === "script" && <>
        {editing && <label>ชื่อตอน<input value={draft.title} onChange={event => { setDirty(true); setDraft({ ...draft, title: event.target.value }); }} /></label>}
        <ol className="script-read">{draft.segments.map((seg, index) => <li key={seg.id} className={seg.skip ? "skipped" : ""}>
          <span className="script-no">{index + 1}</span>
          {seg.image ? <img className="script-thumb" src={asset(seg.image)} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = "hidden"; }} /> : <span className="script-thumb" />}
          <div className="script-body">
            <div className="script-meta"><code>{seg.id}</code>{seg.skip && <Badge>ข้าม</Badge>}</div>
            {editing && !story ? <textarea rows={2} value={seg.text} onChange={event => edit(seg.id, { text: event.target.value })} />
              : <p className="script-line">{seg.text.split("\n").map((line, i) => <span key={i}>{line}</span>)}</p>}
            {editing ? <textarea className="script-cards-edit" rows={Math.max(1, seg.cards.length)} placeholder="ซับ: 1 บรรทัด = 1 การ์ด" value={seg.cards.join("\n")} onChange={event => edit(seg.id, { cards: event.target.value.split("\n") })} />
              : !!seg.cards.length && <div className="script-cards">{seg.cards.map((card, i) => <span key={i}>{card}</span>)}</div>}
            {seg.image && (editing ? <textarea className="script-prompt-edit" rows={2} placeholder={"prompt ภาพ (ไทย) — เดิม: " + seg.image_prompt} value={seg.image_prompt_th} onChange={event => edit(seg.id, { image_prompt_th: event.target.value })} />
              : showPrompts && <PromptText seg={seg} />)}
          </div>
        </li>)}</ol>
      </>}

      {view === "publish" && (editing ? <textarea rows={18} value={publish} onChange={event => { setDirty(true); setPublish(event.target.value); }} />
        : publish ? <div className="markdown publish-read"><Markdown>{publish}</Markdown></div> : <Empty>ยังไม่มี publish.md</Empty>)}
    </Card>
    <Card className="section-card stack">
      <h2>ให้ Claude แก้บท</h2>
      <textarea rows={3} value={note} placeholder="เช่น ให้ประโยคปิดอบอุ่นกว่านี้ / สั้นลงเหลือ 15 วินาที" onChange={event => setNote(event.target.value)} />
      <Button variant="outline" disabled={busy || !note.trim()} onClick={async () => { await enqueue("revise", { episode: id, note }); setNote(""); toast.success("ส่งให้ Claude แก้แล้ว"); }}><Sparkles size={15} /> ส่งให้ Claude แก้</Button>
    </Card>
  </div>;
}

/** Image prompt shown in Thai (image_prompt_th); tap to see the English prompt Codex actually gets. */
function PromptText({ seg }: { seg: EpisodeDetail["segments"][number] }) {
  const [english, setEnglish] = useState(false);
  if (!seg.image_prompt_th) return <span className="script-prompt">🖼 <span className="lang-tag">EN</span> {seg.image_prompt}</span>;
  return <span className="script-prompt">🖼 {english ? seg.image_prompt : seg.image_prompt_th}{" "}
    <button type="button" className="lang-toggle" onClick={() => setEnglish(!english)}>{english ? "ไทย" : "EN"}</button></span>;
}

function ImagesReview({ id, detail, asset, busy }: { id: string; detail: EpisodeDetail; asset: (f: string) => string; busy: boolean }) {
  const { enqueue } = useOps();
  const [redo, setRedo] = useState<{ seg: string; prompt: string } | null>(null);
  const seen = new Set<string>();
  const items = detail.segments.filter(s => s.image && !seen.has(s.image) && seen.add(s.image));
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(null);
      if (event.key === "ArrowRight") setZoom(z => z === null ? z : (z + 1) % items.length);
      if (event.key === "ArrowLeft") setZoom(z => z === null ? z : (z - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, items.length]);
  const zoomed = zoom === null ? null : items[zoom];
  return <>
    {detail.mode !== "story" && <VoicePicker id={id} detail={detail} busy={busy} record={false} />}
    {zoomed && <div className="lightbox" role="dialog" aria-modal="true" aria-label={"ภาพ " + zoomed.id} onClick={() => setZoom(null)}>
      <img src={asset(zoomed.image)} alt={zoomed.image_prompt} />
      <div className="lightbox-bar" onClick={event => event.stopPropagation()}>
        <span className="small"><code>{zoomed.id}</code> {zoom! + 1}/{items.length}</span>
        {items.length > 1 && <><Button variant="ghost" aria-label="ภาพก่อนหน้า" onClick={() => setZoom((zoom! - 1 + items.length) % items.length)}><ArrowLeft size={18} /></Button>
          <Button variant="ghost" aria-label="ภาพถัดไป" onClick={() => setZoom((zoom! + 1) % items.length)}><ArrowRight size={18} /></Button></>}
        <Button variant="ghost" onClick={() => setZoom(null)}>ปิด</Button>
      </div>
    </div>}
    <div className="image-grid">{items.map((seg, index) => <Card key={seg.id} className="image-card">
      <button type="button" className="image-frame" aria-label={"ดูภาพ " + seg.id + " เต็มจอ"} onClick={() => setZoom(index)}><img src={asset(seg.image)} alt={seg.image_prompt} onError={event => { event.currentTarget.style.visibility = "hidden"; }} /></button>
      <div className="small"><code>{seg.id}</code> <PromptText seg={seg} /></div>
      <Button variant="outline" disabled={busy} onClick={() => setRedo({ seg: seg.id, prompt: seg.image_prompt_th || seg.image_prompt })}><RefreshCw size={15} /> สร้างภาพนี้ใหม่</Button>
    </Card>)}</div>
    {redo && <Modal open close={() => setRedo(null)} title="สร้างภาพใหม่" description="แก้คำอธิบายภาพเป็นภาษาไทยได้ ระบบแปลเป็นอังกฤษให้ก่อนสร้าง · ภาพเดิมเก็บไว้ใน images/_old/">
      <AsyncForm className="stack" onSubmit={async event => { event.preventDefault(); await enqueue("regen_image", { episode: id, segment: redo.seg, prompt_th: redo.prompt }); setRedo(null); toast.success("กำลังสร้างภาพใหม่"); }}>
        <label>คำอธิบายภาพ (ไทย)<textarea rows={4} value={redo.prompt} onChange={event => setRedo({ ...redo, prompt: event.target.value })} /></label>
        <div className="modal-actions"><Button type="button" variant="outline" onClick={() => setRedo(null)}>ยกเลิก</Button><Button type="submit"><RefreshCw size={15} /> สร้างใหม่</Button></div>
      </AsyncForm>
    </Modal>}
  </>;
}

/** Where subtitles sit in the render: saved as episode.json "subtitles", used by the next render. */
function SubtitlePicker({ id, detail, busy }: { id: string; detail: EpisodeDetail; busy: boolean }) {
  const [value, setValue] = useState<SubtitlePosition>(detail.subtitles ?? detail.subtitlesDefault);
  useEffect(() => { setValue(detail.subtitles ?? detail.subtitlesDefault); }, [detail.subtitles, detail.subtitlesDefault]);
  const options: { key: SubtitlePosition; label: string; hint: string }[] = [
    { key: "center", label: "กลางจอ", hint: "ตัวใหญ่ อ่านง่าย เหมาะกับภาพบรรยากาศ" },
    { key: "lower", label: "ด้านล่าง", hint: "ไม่บังภาพ/ตัวละคร อยู่เหนือปุ่มของแอป" },
  ];
  async function choose(next: SubtitlePosition) {
    if (next === value) return;
    await api("/api/episodes/" + id + "/script", { method: "PATCH", json: { subtitles: next } }).catch(fail);
    setValue(next);
    toast.success("ซับ" + (next === "lower" ? "ด้านล่าง" : "กลางจอ") + " · มีผลตอนเรนเดอร์");
  }
  return <Card className="section-card subtitle-picker">
    <div><span className="small muted">ตำแหน่งซับ</span>
      <span className="small muted">{detail.subtitles ? "ตั้งไว้สำหรับตอนนี้" : "ค่าเริ่มต้น (" + (detail.subtitlesDefault === "lower" ? "ด้านล่าง" : "กลางจอ") + ")"}</span></div>
    <div className="subtitle-options">{options.map(option => <button key={option.key} type="button" disabled={busy}
      className={"subtitle-option" + (value === option.key ? " selected" : "")} aria-pressed={value === option.key} onClick={() => choose(option.key)}>
      <span className={"phone-mock " + option.key}><i /></span>
      <span><strong>{option.label}</strong><span className="small muted">{option.hint}</span></span>
    </button>)}</div>
  </Card>;
}

type VoiceOption = { key: string; tts: "edge" | "elevenlabs"; voice: string; model: string | null; name: string; detail: string; sample: string | null; usedBy: number };

/** Pick the narrator voice for the whole episode (e.g. a female voice for a girl on screen); re-records every segment. */
/** record=false: choose the voice before any audio exists (images step) - it is used when the voice step runs. */
function VoicePicker({ id, detail, busy, record = true }: { id: string; detail: EpisodeDetail; busy: boolean; record?: boolean }) {
  const { refreshEpisodes } = useOps();
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [current, setCurrent] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    void api<{ key: string }>("/api/episodes/" + id + "/voice").then(r => { setCurrent(r.key); setChosen(r.key); }).catch(() => undefined);
  }, [id, detail]);
  // load the voice list up front so the card shows the voice's name, not its id (server caches ElevenLabs for 10 min)
  useEffect(() => { void api<VoiceOption[]>("/api/voices").then(setVoices).catch(() => undefined); }, []);
  const chars = detail.segments.filter(s => !s.skip).reduce((n, s) => n + s.text.replace(/\[[^\]]*\]/g, "").length, 0);
  const now = voices?.find(v => v.key === current);
  const pick = voices?.find(v => v.key === chosen);
  const shown = (voices ?? []).filter(v => !query.trim() || (v.name + " " + v.detail).toLowerCase().includes(query.trim().toLowerCase()));
  return <Card className="section-card voice-picker">
    <div><span className="small muted">เสียงผู้บรรยาย</span><strong>{now ? now.name : current.split("|")[1] || "—"}</strong>
      <span className="small muted">{now?.detail ?? current.split("|").filter(Boolean).join(" · ")}</span></div>
    <Button variant="outline" disabled={busy} onClick={() => setOpen(true)}><Mic size={15} /> เปลี่ยนเสียง</Button>
    {open && <Modal open close={() => setOpen(false)} title="เลือกเสียงผู้บรรยาย" description={record ? `ฟังตัวอย่างก่อนเลือก · เปลี่ยนแล้วจะอัดเสียงใหม่ทั้งตอน (~${chars.toLocaleString("th-TH")} ตัวอักษร)` : `ฟังตัวอย่างก่อนเลือก · เสียงนี้จะใช้ตอนทำเสียงหลังอนุมัติภาพ (~${chars.toLocaleString("th-TH")} ตัวอักษร)`}>
      <div className="stack">
        <input type="search" placeholder="ค้นหาชื่อเสียง / หญิง / ชาย" value={query} onChange={event => setQuery(event.target.value)} />
        {!voices ? <p className="small muted"><Loader2 size={14} className="spin" /> กำลังโหลดรายชื่อเสียง…</p>
          : <div className="voice-list">{shown.map(v => <label key={v.key} className={"voice-option" + (v.key === chosen ? " selected" : "")}>
            <input type="radio" name="voice" checked={v.key === chosen} onChange={() => setChosen(v.key)} />
            <span className="voice-text"><strong>{v.name}{v.key === current && <span className="small muted"> · ใช้อยู่</span>}</strong>
              <span className="small muted">{v.detail}{v.usedBy ? ` · ใช้ใน ${v.usedBy} ตอน` : ""}</span></span>
            {v.sample ? <audio controls preload="none" src={v.sample} onClick={event => event.stopPropagation()} /> : <span className="small muted">ไม่มีตัวอย่าง</span>}
          </label>)}</div>}
        <div className="modal-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button disabled={!pick || chosen === current} onClick={async () => {
            await api("/api/episodes/" + id + "/voice", { method: "POST", json: { tts: pick!.tts, voice: pick!.voice, model: pick!.model, record } }).catch(fail);
            setCurrent(chosen); setOpen(false); await refreshEpisodes();
            toast.success("เปลี่ยนเป็นเสียง " + pick!.name + (record ? " · กำลังอัดใหม่ทั้งตอน" : " · ใช้ตอนทำเสียง"));
          }}><Mic size={15} /> {record ? "ใช้เสียงนี้ อัดใหม่ทั้งตอน" : "ใช้เสียงนี้"}</Button></div>
      </div>
    </Modal>}
  </Card>;
}

function VoiceReview({ id, detail, asset, busy }: { id: string; detail: EpisodeDetail; asset: (f: string) => string; busy: boolean }) {
  const { enqueue } = useOps();
  const [redo, setRedo] = useState<{ seg: string; text: string } | null>(null);
  return <>
    <VoicePicker id={id} detail={detail} busy={busy} />
    <SubtitlePicker id={id} detail={detail} busy={busy} />
    <Card className="section-card stack">
      <h2>เสียงทั้งคลิป</h2><audio controls preload="none" src={asset("audio/voice.mp3")} />
    </Card>
    <div className="stack">{detail.segments.map((seg, index) => <Card key={seg.id} className="voice-row">
      <div><code>{index + 1}. {seg.id}</code><p>{seg.text}</p></div>
      {seg.audio ? <audio controls preload="none" src={asset(seg.audio)} /> : <span className="small muted">ยังไม่มีเสียง</span>}
      <Button variant="outline" disabled={busy} onClick={() => setRedo({ seg: seg.id, text: seg.text })}><RefreshCw size={15} /> อัดใหม่</Button>
    </Card>)}</div>
    {redo && <Modal open close={() => setRedo(null)} title="อัดเสียงช่วงนี้ใหม่" description="แก้ข้อความได้ (ใส่ audio tag เช่น [softly] ได้ถ้าใช้ ElevenLabs)">
      <AsyncForm className="stack" onSubmit={async event => { event.preventDefault(); await enqueue("regen_voice", { episode: id, segment: redo.seg, text: redo.text }); setRedo(null); toast.success("กำลังอัดใหม่"); }}>
        <label>บทพูด<textarea rows={3} value={redo.text} onChange={event => setRedo({ ...redo, text: event.target.value })} /></label>
        <div className="modal-actions"><Button type="button" variant="outline" onClick={() => setRedo(null)}>ยกเลิก</Button><Button type="submit"><Mic size={15} /> อัดใหม่</Button></div>
      </AsyncForm>
    </Modal>}
  </>;
}

function RenderReview({ episode, busy }: { episode: Episode; busy: boolean }) {
  const { enqueue } = useOps();
  const [note, setNote] = useState("");
  const take = episode.versions.find(v => v.id === episode.selectedVersion);
  return <Card className="section-card stack">
    {take ? <><video className="player review-player" key={take.videoUrl} controls playsInline preload="metadata" src={take.videoUrl} poster={take.posterUrl} />
      <p className="small muted">รอบ {take.number}/{episode.versions.length}{take.duration ? " · " + take.duration + " วิ" : ""} — รอบอื่นดูได้ในแท็บประวัติของหน้าคลิป</p></>
      : <Empty>{busy ? "กำลังเรนเดอร์…" : "ยังไม่มีคลิป (ระบบเก็บเข้าประวัติภายใน ~30 วินาทีหลังเรนเดอร์เสร็จ)"}</Empty>}
    <label>อยากปรับอะไรก่อนเรนเดอร์ใหม่ <span className="small muted">(ไม่บังคับ — Claude แก้ episode.json ให้ก่อนเรนเดอร์)</span>
      <textarea rows={3} value={note} placeholder="เช่น ซับใหญ่ขึ้นและอยู่ต่ำลง / ภาพขยับช้าลง / ตัดช่วงที่ 3 ออก / เว้นจังหวะก่อนประโยคสุดท้ายนานขึ้น" onChange={event => setNote(event.target.value)} /></label>
    <Button variant="outline" disabled={busy} onClick={async () => {
      await enqueue("render", note.trim() ? { episode: episode.id, note: note.trim() } : { episode: episode.id });
      toast.success(note.trim() ? "ส่งให้ Claude ปรับแล้วเรนเดอร์ใหม่" : "เรนเดอร์ใหม่แล้ว"); setNote("");
    }}><RefreshCw size={15} /> {note.trim() ? "ปรับแล้วเรนเดอร์ใหม่" : "เรนเดอร์ใหม่"}</Button>
  </Card>;
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AudioLines, Mic, Plus, Save, Trash2, UsersRound } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import type { Character, CharacterFile } from "@/lib/characters";
import { Empty, JobBadge } from "./common";
import { useOps } from "./ops-provider";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const epHref = (series: string, slug: string) => `/episodes/${series}/${slug}`;

export function CharacterList({ items }: { items: Character[] }) {
  const real = items.filter(c => !c.name.startsWith("_"));
  return <section className="stack">
    <div className="section-heading"><div><h1><UsersRound size={20} /> ตัวละคร</h1><p className="muted">shared/characters — ออกแบบครั้งเดียว ใช้ซ้ำทุกคลิป</p></div></div>
    {!real.length && <Empty>ยังไม่มีตัวละคร</Empty>}
    <div className="experiment-grid">{real.map(c => <Link key={c.name} href={"/characters/" + c.name} className="character-card">
      <Card className="section-card">
        {c.references[0] && <img src={c.references[0].url} alt={c.displayName} loading="lazy" className="character-thumb" />}
        <div className="post-section-heading"><h3>{c.displayName}</h3><span className="small muted">{c.name}</span></div>
        <p className="small muted">{c.references.length} ภาพอ้างอิง · ใช้ใน {c.usedBy.length} ตอน{c.hasJson ? "" : " · ยังไม่มี character.json"}</p>
      </Card>
    </Link>)}</div>
  </section>;
}

function Gallery({ files }: { files: CharacterFile[] }) {
  const [zoom, setZoom] = useState<CharacterFile | null>(null);
  if (!files.length) return <Empty>ยังไม่มีภาพใน reference/</Empty>;
  return <>
    <div className="experiment-grid images">{files.map(f => <figure key={f.name} className="experiment-file">
      <button type="button" className="experiment-thumb" onClick={() => setZoom(f)} aria-label={"ดู " + f.name + " เต็มจอ"}><img src={f.url} alt={f.name} loading="lazy" /></button>
      <figcaption className="small">{f.name}</figcaption>
    </figure>)}</div>
    {zoom && <div className="lightbox" role="dialog" aria-modal="true" aria-label={zoom.name} onClick={() => setZoom(null)}>
      <img src={zoom.url} alt={zoom.name} /><div className="lightbox-bar"><span className="small">{zoom.name} · แตะเพื่อปิด</span></div>
    </div>}
  </>;
}

export function CharacterDetail({ item }: { item: Character }) {
  const router = useRouter();
  const [block, setBlock] = useState(item.imageBlock);
  const [voiceId, setVoiceId] = useState(item.voice.voice ?? "");
  const [model, setModel] = useState(item.voice.model ?? "");
  const [samples, setSamples] = useState<[string, string][]>(Object.entries(item.samples));
  const [persona, setPersona] = useState(false);
  const [saving, setSaving] = useState(false);
  const { jobs, enqueue } = useOps();
  const sampleJob = jobs.find(j => j.type === "voice_samples" && j.args.character === item.name);
  const busy = sampleJob?.status === "queued" || sampleJob?.status === "running";
  const dirty = JSON.stringify(Object.fromEntries(samples)) !== JSON.stringify(item.samples)
    || voiceId !== (item.voice.voice ?? "") || model !== (item.voice.model ?? "") || block !== item.imageBlock;
  const doneId = sampleJob?.status === "done" ? sampleJob.id : "";
  useEffect(() => { if (doneId) router.refresh(); }, [doneId, router]);  // pick up new mp3 files
  // cache-bust audio after a new run
  const sampleUrl = (emotion: string) => {
    const url = item.voiceSamples.find(f => f.name === emotion + ".mp3")?.url;
    return url && sampleJob?.finished_at ? url + "&t=" + encodeURIComponent(sampleJob.finished_at) : url;
  };

  async function makeSamples() {
    if (!window.confirm(`สร้างเสียงตัวอย่าง ${samples.length} ประโยคด้วย ElevenLabs? (ใช้เครดิตประมาณ ${samples.reduce((n, [, t]) => n + t.length, 0)} ตัวอักษร, ไฟล์เดิมจะถูกแทนที่)`)) return;
    await enqueue("voice_samples", { character: item.name });
    toast.success("ส่งงานสร้างเสียงตัวอย่างแล้ว");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/characters/" + item.name, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_block: block, voice: { voice: voiceId, model }, samples: Object.fromEntries(samples) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success("บันทึก character.json แล้ว");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  }

  return <section className="stack">
    <Link href="/characters" className="link-button"><ArrowLeft size={15} /> ตัวละครทั้งหมด</Link>
    <div className="section-heading"><div><h1>{item.displayName}</h1><p className="muted">shared/characters/{item.name}</p></div></div>

    <Card className="section-card"><h3>ภาพอ้างอิง</h3><Gallery files={item.references} />
      {!!item.refs.length && <p className="small muted">แนบไปกับ Codex: {item.refs.join(", ")}</p>}</Card>

    {item.hasJson ? <Card className="section-card">
      <h3>ข้อมูลที่เครื่องมือใช้ (character.json)</h3>
      <label>Image block <span className="small muted">(ต่อท้าย image_style ทุกภาพที่มีตัวละครนี้ — ภาษาอังกฤษ)</span>
        <textarea rows={5} value={block} onChange={e => setBlock(e.target.value)} /></label>
      <div className="character-voice">
        <label>ElevenLabs voice_id<input value={voiceId} onChange={e => setVoiceId(e.target.value)} /></label>
        <label>Model<input value={model} onChange={e => setModel(e.target.value)} placeholder="eleven_v3" /></label>
      </div>
      <p className="small muted">เปลี่ยนเสียงแล้วต้องทดสอบด้วย API จริงก่อน (บางเสียงตอบ 400 &quot;not fine-tuned&quot;) — ตอนที่ใส่ voice เองจะไม่ถูกเปลี่ยน</p>
      <h4><Mic size={15} /> ประโยคตัวอย่างตามอารมณ์</h4>
      {samples.map(([emotion, text], i) => <div key={i} className="character-sample">
        <input aria-label="อารมณ์" value={emotion} onChange={e => setSamples(samples.map((s, j) => j === i ? [e.target.value, s[1]] : s))} />
        <input aria-label="ประโยค" value={text} onChange={e => setSamples(samples.map((s, j) => j === i ? [s[0], e.target.value] : s))} />
        <Button type="button" variant="ghost" size="icon" aria-label={"ลบ " + emotion} onClick={() => setSamples(samples.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
        {sampleUrl(emotion) && <audio controls preload="none" src={sampleUrl(emotion)} />}
      </div>)}
      <Button type="button" variant="outline" onClick={() => setSamples([...samples, ["", ""]])}><Plus size={16} /> เพิ่มอารมณ์</Button>
      <div className="character-sample-run">
        <Button type="button" variant="outline" onClick={makeSamples} disabled={busy || dirty || !samples.length}><AudioLines size={16} /> สร้างเสียงตัวอย่าง</Button>
        {sampleJob && <Link href={"/jobs/" + sampleJob.id}><JobBadge status={sampleJob.status} /></Link>}
        <span className="small muted">{dirty ? "บันทึกก่อน แล้วค่อยสร้างเสียง" : "ใช้เครดิต ElevenLabs · ต้องมี worker ทำงานอยู่"}</span>
      </div>
      <Button type="button" onClick={save} disabled={saving}><Save size={16} /> {saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
    </Card> : <Card className="section-card"><Empty>ยังไม่มี character.json — เครื่องมือยังใช้ตัวละครนี้อัตโนมัติไม่ได้</Empty></Card>}

    <Card className="section-card"><h3>ใช้ในตอน ({item.usedBy.length})</h3>
      {!item.usedBy.length ? <Empty>ยังไม่มีตอนที่ใช้</Empty> : <ul className="character-uses">{item.usedBy.map(u =>
        <li key={u.series + u.slug}><Link href={epHref(u.series, u.slug)}>{u.series} / {u.slug}</Link> <span className="small muted">({u.as.join(", ")})</span></li>)}</ul>}
    </Card>

    {item.persona && <Card className="section-card">
      <button className="link-button" onClick={() => setPersona(!persona)}>{persona ? "ซ่อน" : "อ่าน"} persona.md (ประวัติตัวละคร)</button>
      {persona && <div className="markdown"><Markdown>{item.persona}</Markdown></div>}
    </Card>}
  </section>;
}

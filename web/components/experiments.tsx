"use client";
import { useState } from "react";
import { FlaskConical, ImageIcon, Video } from "lucide-react";
import Markdown from "react-markdown";
import { Empty } from "./common";
import { Card } from "./ui/card";

type ExperimentFile = { name: string; kind: "video" | "image"; size: number; mtime: string; url: string };
type Experiment = { name: string; readme: string; files: ExperimentFile[] };

const mb = (bytes: number) => (bytes / 1e6).toFixed(1) + " MB";
const when = (iso: string) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Standalone POC experiments (content/poc/<name>/README.md + output/poc/<name>/ results). */
export function Experiments({ items }: { items: Experiment[] }) {
  if (!items.length) return null;
  return <section className="experiments">
    <div className="section-heading"><div><h2><FlaskConical size={18} /> การทดลองอื่น ๆ</h2><p className="muted">โฟลเดอร์ใน content/poc ที่ไม่ใช่ตอน ไฟล์ผลลัพธ์จาก output/poc</p></div></div>
    {items.map(item => <ExperimentCard key={item.name} item={item} />)}
  </section>;
}

function ExperimentCard({ item }: { item: Experiment }) {
  const [readme, setReadme] = useState(false);
  const [zoom, setZoom] = useState<ExperimentFile | null>(null);
  const videos = item.files.filter(f => f.kind === "video");
  const images = item.files.filter(f => f.kind === "image");
  return <Card className="section-card stack">
    <div className="post-section-heading"><h3>{item.name}</h3><span className="small muted">{videos.length} วิดีโอ · {images.length} ภาพ</span></div>
    {item.readme && <><button className="link-button" onClick={() => setReadme(!readme)}>{readme ? "ซ่อน" : "อ่าน"} README</button>
      {readme && <div className="markdown">{<Markdown>{item.readme}</Markdown>}</div>}</>}
    {!item.files.length && <Empty>ยังไม่มีไฟล์ผลลัพธ์ใน output/poc/{item.name}</Empty>}
    {!!videos.length && <div className="experiment-grid">{videos.map(f => <figure key={f.name} className="experiment-file">
      <video controls playsInline preload="metadata" src={f.url} />
      <figcaption className="small"><Video size={13} /> {f.name}<span className="muted"> · {mb(f.size)} · {when(f.mtime)}</span></figcaption>
    </figure>)}</div>}
    {!!images.length && <div className="experiment-grid images">{images.map(f => <figure key={f.name} className="experiment-file">
      <button type="button" className="experiment-thumb" onClick={() => setZoom(f)} aria-label={"ดู " + f.name + " เต็มจอ"}><img src={f.url} alt={f.name} loading="lazy" /></button>
      <figcaption className="small"><ImageIcon size={13} /> {f.name}<span className="muted"> · {mb(f.size)}</span></figcaption>
    </figure>)}</div>}
    {zoom && <div className="lightbox" role="dialog" aria-modal="true" aria-label={zoom.name} onClick={() => setZoom(null)}>
      <img src={zoom.url} alt={zoom.name} /><div className="lightbox-bar"><span className="small">{zoom.name} · แตะเพื่อปิด</span></div>
    </div>}
  </Card>;
}

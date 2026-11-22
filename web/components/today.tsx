"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ArrowUpRight, CalendarClock, Check, Clock3, Film, Star } from "lucide-react";
import { toast } from "sonner";
import { candidates, planToday, type PublishField } from "@/lib/data";
import { thaiDate } from "@/lib/time";
import { platforms, type Platform, type Slot, type Today } from "@/lib/types";
import { useOps } from "./ops-provider";
import { CopyButton, Empty, PlatformBadge, Poster, SeriesChip, SlotBadge, episodeHref, platformNames } from "./common";
import { PostForm } from "./post-form";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Confirm, Modal } from "./ui/dialog";

type Active = { kind: "post" | "pick" | "facebook"; slot: Slot };
const slotKey = (slot: Slot) => slot.platform + "@" + slot.time;

export function TodayScreen({ initial, fields }: { initial: Today; fields: Record<string, Record<Platform, PublishField[]>> }) {
  const { episodes, schedule, picks, setPicks, updatePosts, enqueue } = useOps();
  const [active, setActive] = useState<Active | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const today = planToday(episodes, schedule, picks, initial.date, initial.time);
  const posted = today.slots.filter(slot => slot.state === "posted").length;
  const times = [...new Set(today.slots.map(slot => slot.time))].sort();
  const close = () => setActive(null);
  const activeEpisode = active?.slot.episode;

  return <>
    <header className="page-heading today-heading"><div><p className="date-label"><CalendarClock size={16} />{thaiDate(today.date)}</p><h1>ตารางลงคลิปวันนี้</h1></div>
      <div className="progress-summary"><span>ลงแล้ว <strong>{posted}/{today.slots.length}</strong> สล็อต</span><progress value={posted} max={today.slots.length || 1} aria-label="ความคืบหน้าการลงคลิป" /></div>
    </header>

    <section className="stats-grid today-stats" aria-label="สถานะรายแพลตฟอร์ม">
      {today.summary.map(item => <Card key={item.platform} className={"stat-card" + (item.left < item.total * 2 ? " low-stock" : "")}>
        <div className="stat-top"><PlatformBadge platform={item.platform} /><span className="small muted">ลงแล้ว {item.posted}/{item.total} วันนี้</span></div>
        <div className="stat-count"><strong>{item.left}</strong><span>คลิปที่ยังไม่ลง</span></div><p className="small muted">เหลือใช้ประมาณ {item.days} วัน</p>
      </Card>)}
    </section>

    <section className="schedule-section"><div className="section-heading"><div><h2>คิวลงคลิป</h2><p className="muted">เวลาไทย · {times.length} ช่วงเวลา</p></div><span className="main-slot"><Star size={14} fill="currentColor" /> รอบหลัก {schedule.main_slot}</span></div>
      {times.length ? <div className="schedule-grid">
        <div className="schedule-head"><span>เวลา</span>{platforms.map(platform => <PlatformBadge key={platform} platform={platform} />)}</div>
        {times.map(time => <div className="schedule-row" key={time}>
          <div className={"time-label" + (time === schedule.main_slot ? " main-time" : "")}><Clock3 size={15} />{time}</div>
          {platforms.map(platform => {
            const slot = today.slots.find(item => item.time === time && item.platform === platform);
            return slot ? <SlotCard key={platform} slot={slot} main={time === schedule.main_slot} fields={slot.episode ? fields[slot.episode.id]?.[platform] : undefined} onAction={kind => { setDryRun(true); setActive({ kind, slot }); }} /> : <div className="blank-slot" aria-hidden key={platform} />;
          })}
        </div>)}
      </div> : <Empty>ยังไม่มีเวลาลงคลิปในตาราง</Empty>}
    </section>

    {active?.kind === "post" && activeEpisode && <PostForm close={close} date={today.date} time={active.slot.time} platform={active.slot.platform} save={post => {
      const id = activeEpisode.id;
      updatePosts(id, items => [...items, post]);
      close();
      toast.success("บันทึกแล้ว", { action: { label: "เลิกทำ", onClick: () => updatePosts(id, items => items.filter(item => item !== post)) } });
    }} />}
    {active?.kind === "pick" && <Modal open close={close} sheet title="เปลี่ยนคลิป" description={platformNames[active.slot.platform] + " · " + active.slot.time}>
      <div className="candidate-list">{(() => {
        const reserved = new Set(today.slots.filter(slot => slot.platform === active.slot.platform && slot.time !== active.slot.time).map(slot => slot.episode?.id));
        const remaining = candidates(episodes, active.slot.platform).filter(episode => !reserved.has(episode.id));
        return remaining.length ? remaining.map(episode => <button key={episode.id} className="candidate" onClick={() => {
          setPicks(current => ({ ...current, [slotKey(active.slot)]: episode.id }));
          close();
          toast.success("เปลี่ยนคลิปแล้ว");
        }}><Poster episode={episode} /><span><strong>{episode.title}</strong><SeriesChip series={episode.series} /></span>{episode.id === activeEpisode?.id && <Check size={18} />}</button>) : <Empty>ไม่มีคลิปที่เลือกได้</Empty>;
      })()}</div>
    </Modal>}
    {active?.kind === "facebook" && activeEpisode && <Confirm open close={close}
      title="โพสต์จริงไปที่ Facebook Page — ยืนยัน?"
      description="อย่าลืมติดป้าย AI info ใน Meta Business Suite · การยืนยันในโหมดตัวอย่างจะเพิ่มงานจำลองเท่านั้น"
      confirmLabel="ยืนยันตั้งเวลา" action={() => {
        enqueue("publish_fb", { episode: "content/" + activeEpisode.series + "/episodes/" + activeEpisode.slug, when: today.date + " " + active.slot.time, dry_run: dryRun }, activeEpisode.id);
        toast.success("เพิ่มงานตั้งเวลาแล้ว");
      }}>
      <label className="checkbox"><input type="checkbox" checked={dryRun} onChange={event => setDryRun(event.target.checked)} />ทดสอบคำสั่ง (dry-run)</label>
    </Confirm>}
  </>;
}

function SlotCard({ slot, main, fields, onAction }: { slot: Slot; main: boolean; fields?: PublishField[]; onAction: (kind: Active["kind"]) => void }) {
  const { episode, platform, state } = slot;
  const caption = platform === "youtube" ? fields?.find(field => field.label === "คำอธิบาย")?.value : fields?.find(field => field.label === "แคปชัน")?.value;
  return <Card className={"slot-card slot-" + state}>
    <div className="slot-top"><PlatformBadge platform={platform} compact /><span className="slot-time">{slot.time}</span><SlotBadge state={state} /></div>
    {episode ? <>
      <div className="slot-episode"><Poster episode={episode} linked /><div className="slot-text"><Link href={episodeHref(episode)}>{episode.title}</Link><div className="tag-row"><SeriesChip series={episode.series} />{main && <span className="main-slot"><Star size={12} fill="currentColor" /> รอบหลัก</span>}</div></div></div>
      <div className="slot-actions">
        {caption && <CopyButton value={caption} label="คัดลอกแคปชัน" />}
        <Button variant="outline" asChild><Link href={episodeHref(episode)}><Film size={15} /> ดูคลิป</Link></Button>
        {state !== "posted" && <><Button variant="outline" onClick={() => onAction("pick")}><ArrowLeftRight size={15} /> เปลี่ยนคลิป</Button><Button onClick={() => onAction("post")}><Check size={16} /> ลงแล้ว</Button></>}
        {platform === "facebook" && state !== "posted" && <Button className="facebook-action" variant="ghost" onClick={() => onAction("facebook")}><CalendarClock size={15} /> ตั้งเวลา FB</Button>}
        {slot.post?.url && <Button asChild variant="ghost"><a href={slot.post.url} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> เปิดโพสต์</a></Button>}
      </div>
    </> : <p className="empty-slot-text muted">ไม่มีคลิปพร้อมลงในรอบนี้</p>}
  </Card>;
}

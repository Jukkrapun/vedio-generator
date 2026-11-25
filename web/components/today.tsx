"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, ArrowUpRight, CalendarClock, Check, Clock3, Film, Star } from "lucide-react";
import { toast } from "sonner";
import { candidates, planToday } from "@/lib/planner";
import type { PublishField } from "@/lib/publish";
import { bangkokNow, thaiDate } from "@/lib/time";
import { platforms, type Platform, type Slot, type Today } from "@/lib/types";
import { api, fail, useOps } from "./ops-provider";
import { CopyButton, Empty, FileName, ModeBadge, VersionBadge, takeMode, PlatformBadge, Poster, SeriesChip, SlotBadge, episodeHref, platformNames } from "./common";
import { PostForm } from "./post-form";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Confirm, Modal } from "./ui/dialog";

type Active = { kind: "post" | "pick" | "facebook"; slot: Slot };

export function TodayScreen({ initial, fields }: { initial: Today; fields: Record<string, Record<Platform, PublishField[]>> }) {
  const { episodes, schedule, picks, setPick, addPost, removePost, enqueue } = useOps();
  const [active, setActive] = useState<Active | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [now, setNow] = useState(initial.time);
  useEffect(() => { const timer = window.setInterval(() => setNow(bangkokNow().time), 30_000); return () => window.clearInterval(timer); }, []);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // ?d=0..6: plan the next 7 days. Each day reserves the clips planned (not yet posted) on the days before it,
  // so the week has no repeats. Posts can be marked ahead of time (scheduled posts) on any day.
  const DAYS = 7;
  const dayParam = params.get("d");
  const day = dayParam === "tomorrow" ? 1 : Math.min(DAYS - 1, Math.max(0, Number(dayParam) || 0));
  const dates = Array.from({ length: DAYS }, (_, i) => new Date(Date.parse(initial.date + "T12:00:00+07:00") + i * 86_400_000).toISOString().slice(0, 10));
  const [futurePicks, setFuturePicks] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    void Promise.all(dates.slice(1).map(date => api<Record<string, string>>("/api/picks?date=" + date).then(p => [date, p] as const).catch(() => [date, {}] as const)))
      .then(entries => setFuturePicks(Object.fromEntries(entries)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.date]);
  const plans: Today[] = [];
  let pool = episodes;
  for (let i = 0; i <= day; i++) {
    const plan = planToday(pool, schedule, i === 0 ? picks : futurePicks[dates[i]] ?? {}, dates[i], i === 0 ? now : "00:00");
    plans.push(plan);
    pool = pool.map(episode => {
      const reserved = plan.slots.filter(slot => slot.state !== "posted" && slot.episode?.id === episode.id)
        .map(slot => ({ platform: slot.platform, date: dates[i], time: slot.time, url: "", views: 0, likes: 0, saves: 0 }));
      return reserved.length ? { ...episode, posts: [...episode.posts, ...reserved] } : episode;
    });
  }
  const today = plans[day];
  async function pickFor(platform: Platform, time: string, episodeId: string) {
    if (day === 0) return setPick(platform, time, episodeId);
    await api("/api/picks", { method: "PUT", json: { date: dates[day], platform, time, episode: episodeId } }).catch(fail);
    setFuturePicks(current => ({ ...current, [dates[day]]: { ...(current[dates[day]] ?? {}), [platform + "@" + time]: episodeId } }));
  }
  const query = (next: { p?: string | null; d?: number }) => {
    const q = new URLSearchParams();
    const p = next.p === undefined ? params.get("p") : next.p;
    if (p) q.set("p", p);
    const d = next.d ?? day;
    if (d) q.set("d", String(d));
    return pathname + (q.toString() ? "?" + q : "");
  };
  const dayLabel = (i: number) => i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้"
    : new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric" }).format(new Date(dates[i] + "T12:00:00+07:00"));
  const posted = today.slots.filter(slot => slot.state === "posted").length;
  const times = [...new Set(today.slots.map(slot => slot.time))].sort();
  const close = () => setActive(null);
  const activeEpisode = active?.slot.episode;
  // platform tab (?p=tiktok|youtube|facebook) so posting can be done one platform at a time
  const tab = platforms.find(p => p === params.get("p")) ?? null;
  const setTab = (next: Platform | null) => router.replace(query({ p: next }), { scroll: false });
  const onAction = (slot: Slot) => (kind: Active["kind"]) => { setDryRun(true); setActive({ kind, slot }); };

  return <>
    <div className="segmented day-tabs" role="tablist" aria-label="เลือกวัน">{dates.map((date, i) => {
      const plan = i <= day ? plans[i] : null;
      return <button key={date} role="tab" aria-pressed={day === i} onClick={() => router.replace(query({ d: i }), { scroll: false })}>
        {dayLabel(i)}{plan && <span className="tab-count">{plan.slots.filter(slot => slot.state === "posted").length}/{plan.slots.length}</span>}</button>;
    })}</div>
    <header className="page-heading today-heading"><div><p className="date-label"><CalendarClock size={16} />{thaiDate(today.date)}</p><h1>{day === 0 ? "ตารางลงคลิปวันนี้" : "แผนลงคลิป" + dayLabel(day)}</h1>
      {day > 0 && <p className="small muted">ไม่ซ้ำคลิปที่วางไว้วันก่อนหน้า · กด "เปลี่ยนคลิป" เพื่อจัดเอง · ตั้งเวลาลงล่วงหน้าแล้วกด "ลงแล้ว" ได้เลย</p>}</div>
      <div className="progress-summary"><span>ลงแล้ว <strong>{posted}/{today.slots.length}</strong> สล็อต</span><progress value={posted} max={today.slots.length || 1} aria-label="ความคืบหน้าการลงคลิป" /></div>
    </header>

    <section className="stats-grid today-stats" aria-label="สถานะรายแพลตฟอร์ม">
      {today.summary.map(item => <Card key={item.platform} role="button" tabIndex={0} onClick={() => setTab(tab === item.platform ? null : item.platform)} className={"stat-card stat-tab" + (item.left < item.total * 2 ? " low-stock" : "") + (tab === item.platform ? " selected" : "")}>
        <div className="stat-top"><PlatformBadge platform={item.platform} /><span className="small muted">{"ลงแล้ว " + item.posted + "/" + item.total + (day === 0 ? " วันนี้" : " " + dayLabel(day))}</span></div>
        <div className="stat-count"><strong>{item.left}</strong><span>คลิปที่ยังไม่ลง</span></div><p className="small muted">เหลือใช้ประมาณ {item.days} วัน</p>
      </Card>)}
    </section>

    <section className="schedule-section"><div className="section-heading"><div><h2>คิวลงคลิป</h2><p className="muted">เวลาไทย · {times.length} ช่วงเวลา</p></div><span className="main-slot"><Star size={14} fill="currentColor" /> รอบหลัก {schedule.main_slot}</span></div>
      <div className="segmented platform-tabs" role="tablist" aria-label="เลือกแพลตฟอร์ม">
        <button role="tab" aria-pressed={!tab} onClick={() => setTab(null)}>ทั้งหมด <span className="tab-count">{posted}/{today.slots.length}</span></button>
        {platforms.map(platform => { const mine = today.slots.filter(slot => slot.platform === platform); return <button key={platform} role="tab" aria-pressed={tab === platform} onClick={() => setTab(platform)}>
          <PlatformBadge platform={platform} compact /><span className="tab-count">{mine.filter(slot => slot.state === "posted").length}/{mine.length}</span></button>; })}
      </div>
      {tab ? <div className="platform-slots">{today.slots.filter(slot => slot.platform === tab).sort((a, b) => a.time.localeCompare(b.time)).map(slot =>
        <SlotCard key={slot.time} slot={slot} main={slot.time === schedule.main_slot} fields={slot.episode ? fields[slot.episode.id]?.[tab] : undefined} onAction={onAction(slot)} />)}
        {!today.slots.some(slot => slot.platform === tab) && <Empty>ไม่มีรอบลงคลิปของแพลตฟอร์มนี้</Empty>}</div>
      : times.length ? <div className="schedule-grid">
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

    {active?.kind === "post" && activeEpisode && <PostForm close={close} date={today.date} time={active.slot.time} platform={active.slot.platform} save={async post => {
      const id = activeEpisode.id;
      const index = await addPost(id, post);
      close();
      toast.success("บันทึกแล้ว", { action: { label: "เลิกทำ", onClick: () => void removePost(id, index) } });
    }} />}
    {active?.kind === "pick" && <Modal open close={close} sheet title="เปลี่ยนคลิป" description={platformNames[active.slot.platform] + " · " + active.slot.time}>
      <div className="candidate-list">{(() => {
        const reserved = new Set(today.slots.filter(slot => slot.platform === active.slot.platform && slot.time !== active.slot.time).map(slot => slot.episode?.id));
        const remaining = candidates(episodes, active.slot.platform).filter(episode => !reserved.has(episode.id));
        return remaining.length ? remaining.map(episode => <button key={episode.id} className="candidate" onClick={async () => {
          await pickFor(active.slot.platform, active.slot.time, episode.id);
          close();
          toast.success("เปลี่ยนคลิปแล้ว");
        }}><Poster episode={episode} /><span><strong>{episode.title}</strong><SeriesChip series={episode.series} /><ModeBadge mode={takeMode(episode)} /><VersionBadge episode={episode} /></span>{episode.id === activeEpisode?.id && <Check size={18} />}</button>) : <Empty>ไม่มีคลิปที่เลือกได้</Empty>;
      })()}</div>
    </Modal>}
    {active?.kind === "facebook" && activeEpisode && <Confirm open close={close}
      title="โพสต์จริงไปที่ Facebook Page — ยืนยัน?"
      description="อัปโหลด Reel และตั้งเวลาโพสต์จริง (ถ้าไม่ติ๊ก dry-run) · อย่าลืมติดป้าย AI info ใน Meta Business Suite"
      confirmLabel="ยืนยันตั้งเวลา" action={async () => {
        await enqueue("publish_fb", { episode: activeEpisode.id, when: today.date + " " + active.slot.time, dry_run: dryRun });
        toast.success("เพิ่มงานตั้งเวลาแล้ว ดูผลที่หน้างาน");
      }}>
      <label className="checkbox"><input type="checkbox" checked={dryRun} onChange={event => setDryRun(event.target.checked)} />ทดสอบคำสั่ง (dry-run)</label>
    </Confirm>}
  </>;
}

function SlotCard({ slot, main, fields, onAction, future = false }: { slot: Slot; main: boolean; fields?: PublishField[]; onAction: (kind: Active["kind"]) => void; future?: boolean }) {
  const { episode, platform, state } = slot;
  const find = (...labels: string[]) => fields?.find(field => labels.includes(field.label.toLowerCase()))?.value;
  const caption = platform === "youtube" || platform === "youtube_long" ? find("description", "คำอธิบาย") : find("caption", "แคปชัน");
  return <Card className={"slot-card slot-" + state}>
    <div className="slot-top"><PlatformBadge platform={platform} compact /><span className="slot-time">{slot.time}</span><SlotBadge state={state} /></div>
    {episode ? <>
      <div className="slot-episode"><Poster episode={episode} linked /><div className="slot-text"><Link href={episodeHref(episode)}>{episode.title}</Link><FileName episode={episode} /><div className="tag-row"><SeriesChip series={episode.series} /><ModeBadge mode={takeMode(episode)} /><VersionBadge episode={episode} />{main && <span className="main-slot"><Star size={12} fill="currentColor" /> รอบหลัก</span>}</div></div></div>
      <div className="slot-actions">
        {caption && <CopyButton value={caption} label="คัดลอกแคปชัน" />}
        <Button variant="outline" asChild><Link href={episodeHref(episode)}><Film size={15} /> ดูคลิป</Link></Button>
        {state !== "posted" && <><Button variant="outline" onClick={() => onAction("pick")}><ArrowLeftRight size={15} /> เปลี่ยนคลิป</Button>{!future && <Button onClick={() => onAction("post")}><Check size={16} /> ลงแล้ว</Button>}</>}
        {platform === "facebook" && state !== "posted" && <Button className="facebook-action" variant="ghost" onClick={() => onAction("facebook")}><CalendarClock size={15} /> ตั้งเวลา FB</Button>}
        {slot.post?.url && <Button asChild variant="ghost"><a href={slot.post.url} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /> เปิดโพสต์</a></Button>}
      </div>
    </> : <p className="empty-slot-text muted">ไม่มีคลิปพร้อมลงในรอบนี้</p>}
  </Card>;
}

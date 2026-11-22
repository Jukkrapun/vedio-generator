"use client";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { platforms, type Platform } from "@/lib/types";
import { thaiDate } from "@/lib/time";
import { useOps } from "./ops-provider";
import { PlatformBadge } from "./common";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export function SettingsScreen() {
  const { schedule, setSchedule } = useOps();
  const router = useRouter();
  const [draft, setDraft] = useState(schedule);
  const times = [...new Set(Object.values(draft.slots).flat())].sort();
  function setTimes(platform: Platform, next: string[]) {
    setDraft(current => {
      const slots = { ...current.slots, [platform]: next };
      const available = [...new Set(Object.values(slots).flat())].sort();
      return { ...current, slots, main_slot: available.includes(current.main_slot) ? current.main_slot : available.at(-1) ?? "" };
    });
  }
  return <>
    <header className="page-heading"><div><h1>ตั้งค่า</h1><p className="muted">จัดการเวลาลงคลิปในแต่ละแพลตฟอร์ม</p></div></header>
    <div className="settings-grid">
      <Card className="section-card"><div className="subheading-icon"><Clock3 size={20} /><h2>ตารางลงคลิป</h2></div>
        <p className="muted">เขตเวลาไทย (Asia/Bangkok)</p>
        {platforms.map(platform => <section key={platform} className="platform-settings">
          <h3><PlatformBadge platform={platform} /></h3>
          <div className="time-chips">{draft.slots[platform].length ? draft.slots[platform].map(time => <div className="time-chip" key={time}><span>{time}</span>
            <Button type="button" variant="ghost" size="icon" aria-label={"ลบเวลา " + time} onClick={() => setTimes(platform, draft.slots[platform].filter(value => value !== time))}><X size={15} /></Button></div>) : <p className="small muted">ยังไม่มีรอบลงคลิป</p>}</div>
          <form className="time-add" onSubmit={event => {
            event.preventDefault();
            const form = event.currentTarget;
            const time = String(new FormData(form).get("time"));
            if (draft.slots[platform].includes(time)) { toast.error("มีเวลานี้อยู่แล้ว"); return; }
            setTimes(platform, [...draft.slots[platform], time].sort());
            form.reset();
          }}>
            <input type="time" name="time" aria-label={"เวลาใหม่สำหรับ " + platform} required /><Button type="submit" variant="outline"><Plus size={16} /> เพิ่มเวลา</Button>
          </form>
        </section>)}
        <div className="settings-footer"><label>รอบหลัก<select value={draft.main_slot} onChange={event => setDraft({ ...draft, main_slot: event.target.value })} disabled={!times.length}>
          {!times.length && <option value="">ยังไม่มีเวลา</option>}{times.map(time => <option key={time} value={time}>{time}</option>)}
        </select></label><Button onClick={() => { setSchedule(draft); toast.success("บันทึกตารางแล้ว"); }}><Save size={16} /> บันทึกตาราง</Button></div>
      </Card>
      <div className="stack">
        <Card className="section-card"><h2>ช่วงทดลองตาราง</h2><p className="muted">ถึง {thaiDate(draft.test_until)}</p></Card>
        <Card className="section-card"><h2>บัญชี</h2><Button variant="outline" onClick={() => router.push("/login")}><LogOut size={16} /> ออกจากระบบ</Button></Card>
      </div>
    </div>
  </>;
}

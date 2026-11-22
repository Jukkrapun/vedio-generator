"use client";
import { useState } from "react";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { platformNames } from "./common";
import { platforms, type Platform, type Post } from "@/lib/types";

export function PostForm({ close, save, date, time, platform }: { close: () => void; save: (post: Post) => void; date: string; time: string; platform?: Platform }) {
  const [error, setError] = useState("");
  return <Modal open close={close} title={platform ? "บันทึกว่าลงแล้ว" : "เพิ่มบันทึกการลงโพสต์"} description={platform ? platformNames[platform] : undefined}>
    <form className="stack" onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const url = String(data.get("url")).trim();
      if (url && !/^https?:\/\//i.test(url)) { setError("ลิงก์ต้องขึ้นต้นด้วย https:// หรือ http://"); return; }
      save({ platform: platform ?? data.get("platform") as Platform, date: String(platform ? date : data.get("date")), time: String(data.get("time")), url, views: 0, likes: 0, saves: 0, source: "web" });
    }}>
      {!platform && <label>แพลตฟอร์ม<select name="platform">{platforms.map(key => <option key={key} value={key}>{platformNames[key]}</option>)}</select></label>}
      <div className="form-grid">{!platform && <label>วันที่<input name="date" type="date" defaultValue={date} required /></label>}
        <label>เวลา (ไทย)<input name="time" type="time" defaultValue={time} required /></label></div>
      <label>ลิงก์โพสต์ <span className="muted">(ไม่บังคับ)</span><input name="url" type="url" placeholder="https://…" /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions"><Button type="button" variant="outline" onClick={close}>ยกเลิก</Button><Button type="submit">บันทึก</Button></div>
    </form>
  </Modal>;
}

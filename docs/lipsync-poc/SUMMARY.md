# สรุป POC lip-sync โหมด video (ใบเตยพูดเอง) — 2026-11-22

สถานะ: **หยุดพักไว้** (ผู้ใช้สั่ง 2026-11-23) · เครดิต vast.ai คงเหลือ **$0.77** · ไม่มี instance ค้าง

คลิปทดสอบทุกตัวใช้ work-talk 005 (`005-2026-11-20-rest-is-work`, 20 วินาที, look `velvet-evening`, เสียงเดิมจาก cache)

## ผลโดยรวม

| Engine | ปากตรงจังหวะ | ความสวย/คม | หัว-ตัวขยับ | เวลา/คลิป 20 วิ | ค่าเครื่อง/คลิป | สถานะ |
|---|---|---|---|---|---|---|
| **MuseTalk 1.5** (RTX 16GB) | ❌ ไม่ค่อยตรง | ❌ ปากเบลอ เห็นรอยต่อ ปากสั่น | ❌ ขยับแค่ปาก | ~9.5 นาที | ~$0.01 | ใช้งานได้ แต่ผู้ใช้ไม่ผ่านคุณภาพ |
| **InfiniteTalk** แบบ L (A100 80GB) | ✅ ตรง (ผู้ใช้ยืนยัน) | ⚠️ หน้าเพี้ยน/ไม่สวยเมื่อเริ่มพูด, 480p นุ่ม | ✅ หัว ตา สีหน้าขยับ | ~28 นาที | ~$0.60 | ใช้ได้ แต่ยังไม่ผ่านเรื่องหน้า |

## ไฟล์ผลลัพธ์ (ไม่อยู่ใน git — เก็บใน output/ และ video/)

- MuseTalk: `output/work-talk/005-2026-11-20-rest-is-work-video.mp4` (raw: `content/work-talk/episodes/005-.../video/host.mp4`)
- InfiniteTalk L: `output/work-talk/005-2026-11-20-rest-is-work-video-infinitetalk-L.mp4` (raw 448×832: `video/host-infinitetalk-L.mp4`)
- โหมดภาพเดิม (ไว้เทียบ): `output/work-talk/005-2026-11-20-rest-is-work-image.mp4`

## 1) MuseTalk 1.5

- รันผ่าน `tools/musetalk_vast.py` + image สำเร็จรูป `jukkrapundocker/vdio-musetalk:1.5` (Docker Hub, public, 7.8GB, สร้างจาก `docker/musetalk/`)
- เวลา (รอบที่สำเร็จ): เช่า 10s · บูต+ดึง image 1m56s · setup 17s · อัปโหลด 41s · inference 3m49s · ดาวน์โหลด 2m08s · ลบเครื่อง 9s · render 21s → **รวม 9m38s, ~$0.01**
- ปัญหาคุณภาพ (ข้อจำกัดของโมเดล): สร้างหน้าที่ 256×256 แล้วขยาย → เบลอ/รอยต่อ, สร้างทีละเฟรม → ปากสั่น, ไม่ได้ฝึกภาษาไทย → จังหวะไม่ตรง, ภาพนิ่ง → ขยับแค่ปาก

## 2) InfiniteTalk (MeiGen, Apache-2.0)

- รันผ่าน `tools/infinitetalk_vast.py` (ติดตั้งบนเครื่องทุกรอบ, ไม่มี image สำเร็จรูป — โมเดล 42–93GB ใหญ่เกินจะ push จากเน็ตบ้าน)
- แบบที่ใช้ได้: **L = โมเดลเต็ม bf16 + LoRA lightx2v 4 steps, 480p, `--offload_model False`, A100 80GB**
- เวลา (รอบ 6): เช่า+บูต 3m07s · ติดตั้ง+โหลดโมเดล 93GB 4m41s · อัปโหลด 35s · **สร้างวิดีโอ 18m27s** · ดาวน์โหลด+ลบ+render 1m14s → **รวม 28 นาที, ~$0.60** ที่ $1.32/ชม.
- ผลที่เห็น: เฟรมแรกใกล้ต้นฉบับ แต่ยิ่งนานหน้ายิ่งเพี้ยน (รูปหน้า ตา เส้นผมสว่างจ้า) — ดูภาพเทียบได้โดยดึงเฟรม 0 กับ 300 จากคลิป raw
- สาเหตุที่น่าจะเป็น: (1) โหมด image-to-video แบบ streaming ต่อช่วงจากเฟรมท้ายของช่วงก่อน → เพี้ยนสะสม (2) LoRA เร่งความเร็ว + 4 steps ลดความเหมือนหน้า (README เตือนไว้) (3) 480p รายละเอียดหน้าหาย

### บทเรียนการติดตั้ง InfiniteTalk (แก้ไว้ในโค้ดแล้ว)

| รอบ | ปัญหา | วิธีแก้ |
|---|---|---|
| 1 | `requirements.txt` มีแค่เวอร์ชันขั้นต่ำ → diffusers ใหม่ต้องการ torch ≥2.6 | pin: diffusers 0.33.1, transformers 4.49.0, accelerate 1.1.1, xfuser 0.4.1 |
| 2 | Python 3.11 ไม่มี `inspect.ArgSpec` | `sed` เปลี่ยนเป็น `FullArgSpec` หลัง clone |
| 3 | image `-runtime` ไม่มี compiler (quanto fp8 ต้อง compile) | ใช้ `-devel` + build-essential + ninja, compile ตอน setup |
| 4 | `hf_xet` โหลดค้างที่ 0 Mbps | `HF_HUB_DISABLE_XET=1` + timeout 15 นาที/ครั้ง ลองซ้ำ 4 ครั้ง (resume ได้) |
| 5 | fp8 บน A6000 ช้ามาก 185 s/step | สาเหตุหลัก `offload_model` เปิดอัตโนมัติ (ย้ายโมเดลไป CPU ทุก forward) → ใส่ `--offload_model False`; fp8 ใช้ LoRA ไม่ได้ จึงเปลี่ยนเป็นโมเดลเต็มบน A100 |

ขั้นติดตั้งทดสอบใน Docker บนเครื่องผู้ใช้ได้ฟรี (ไม่มี GPU — ต้อง mock `torch.cuda.get_device_name/current_device`)

## ค่าใช้จ่าย

- ยอดใช้รวมในบัญชี vast (`total_spend`): **$4.23** · เครดิตคงเหลือ **$0.77** (2026-11-22)
- ที่สคริปต์คำนวณได้ (ค่าเครื่องอย่างเดียว): MuseTalk ~$0.15 (6 รอบ) + InfiniteTalk ~$1.33 (6 รอบ) ≈ $1.5
- ส่วนต่าง ~$2.7 น่าจะเป็นค่าดิสก์/ค่า bandwidth ที่สคริปต์ไม่ได้นับ (ยังไม่ได้ตรวจในหน้า billing) → **ก่อนรันรอบหน้าต้องตรวจ billing และให้สคริปต์อ่านเครดิตจริงจากบัญชี (`vastai show user`) ก่อน/หลังรัน**

## ถ้าจะทำต่อ (ข้อเสนอ ยังไม่ได้ทำ)

1. **InfiniteTalk แบบพากย์วิดีโอ (video-to-video):** แปลง `scene.png` เป็นวิดีโอซูม/เลื่อนช้า ๆ ด้วย ffmpeg บนเครื่องผู้ใช้ (ฟรี) แล้วให้ InfiniteTalk พากย์ทับ — เฟรมต้นทางถูกใช้อ้างอิงตลอดคลิป หน้าน่าจะเพี้ยนน้อยลง ค่าเครื่องเท่าเดิม ~$0.6 + เปิด `--color_correction_strength`
2. ทดสอบด้วยคลิปสั้น ~8 วินาทีก่อน ถ้าเครดิตน้อย (~$0.45)
3. ถ้าหน้าผ่าน: เพิ่ม engine `infinitetalk` ใน `lipsync.py`, ทำ batch หลายคลิปต่อเครื่อง, พิจารณา 720p
4. ทางเลือกอื่น: LatentSync 1.6 (ถูกกว่า แต่ขยับแค่ปาก), LongCat-Video-Avatar-1.5 (ทีมเดียวกัน ใหม่กว่า), sync-2 บน fal (~$1/คลิป)

## โค้ดที่เกี่ยวข้อง

- `tools/vast.py` — เช่า/SSH/ลบเครื่อง (ยืนยันลบจริง), `--cleanup`
- `tools/musetalk_vast.py`, `docker/musetalk/` — MuseTalk
- `tools/infinitetalk_vast.py` — InfiniteTalk (`--variants L --gpu a100`, `--offers`, `--budget`)
- `tools/timing.py` — จับเวลาแต่ละขั้น + ตารางสรุป
- `tools/render_reel.py` — `render(ep, host_video=..., out=...)` สำหรับเรนเดอร์คลิปเทียบ

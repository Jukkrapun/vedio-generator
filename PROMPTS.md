# Prompt สำเร็จรูป

คัดลอกไปวางในแชทกับ Claude แล้วแก้ข้อความใน `[ ]`

**เสียงเริ่มต้นของ love-quotes:** ElevenLabs **Hammy** (`MYZYcGOqrkYQcwDunXl7`), โมเดล `eleven_v3`
ไม่ต้องระบุเสียงใน prompt ถ้าใช้ Hammy

> บัญชีเป็นแพ็กเกจ Creator (รายปี) ได้เดือนละ 130,799 ตัวอักษร รีเซ็ตทุกวันที่ 23 คลิปหนึ่งใช้ประมาณ 200–350 ตัวอักษร

**สกิลเขียนบท/ตัดต่อ:** ทุก prompt ที่ให้เขียนหรือแก้บท Claude จะใช้ 2 สกิลนี้อัตโนมัติ (`.claude/skills/`) ถ้าอยากย้ำให้เติมท้าย prompt ว่า `ใช้สกิล story-hook-framework และ vertical-edit-techniques`
- `story-hook-framework`: hook ใน 1.5 วินาที, ตั้งคำถามภายใน 3 วินาที, เปลี่ยนภาพทุก 3–5 วินาที, จุดพีค (หักมุมแบบคิโชเท็นเค็ตสึ สำหรับคลิปจบในตอน / Serial Reversal สำหรับเรื่องต่อเนื่อง)
- `vertical-edit-techniques`: จัดเฟรมสำหรับมือถือ, safe zone, จังหวะเว้นก่อนประโยคสำคัญ, ซับอ่านง่าย, เสียงพูดดังกว่าเพลง, ตัดแบบ hard cut, จบแบบค้างให้ดูต่อ

**ลิปซิงก์ (โหมด video): พักไว้ก่อน (2026-11-23)** ผลและค่าใช้จ่ายของ POC อยู่ใน `docs/lipsync-poc/SUMMARY.md` ตอนนี้ทำโหมด `image` อย่างเดียว

**สั่งผ่านเว็บได้:** หน้า "งาน" ในเว็บ (http://localhost:3800) ใช้ prompt ข้อ 1–3 ด้านล่างเป็นฟอร์ม Claude เขียนบทให้ แล้วคุณตรวจและอนุมัติทีละขั้น (บท → ภาพ → เสียง → เรนเดอร์) ถ้าแก้ prompt ในไฟล์นี้ ฟอร์มในเว็บจะเปลี่ยนตาม

**โหมดผลิต**
| โหมด | ภาพ | ต้นทุนต่อคลิป |
|---|---|---|
| `image` (ปกติ, ค่าเริ่มต้น) | Codex สร้างภาพช่วงละภาพ + กล้องเคลื่อนแบบ **parallax** (มีมิติ ฉากหน้า/หลังขยับต่างกัน) | เครดิตเสียง + โควตา Codex (parallax ฟรี รันบนเครื่อง) |
| `video` | ใบเตยพูดเข้ากล้อง (ลิปซิงก์) — **พักไว้** | + ค่าลิปซิงก์ |
| `story` | คลิปยาวแนวนอน 16:9 ไทย + อังกฤษ (night-stories) | เครดิตเสียง 2 ภาษา + โควตา Codex |

ตั้งค่าเพิ่มได้ใน `episode.json` ของแต่ละตอน:
- `"motion": "zoom"` = กลับไปใช้ซูมแบบเดิมแทน parallax
- `"parallax": {"margin": 0.06, "zoom": 0.06, "pan": 0.02}` = ครอปขอบภาพน้อยลง กล้องขยับเบาลง (ใช้เมื่อตัวละครชิดขอบ)
- `"subtitles": "lower"` = ซับไว้ด้านล่างแทนกลางจอ
- `"image_rules"` / `"image_refs"` = สไตล์ภาพแบบอื่น (เช่น การ์ตูน) + แนบ character sheet ให้ตัวละครหน้าเหมือนเดิมทุกภาพ (ดูข้อ 9)

แนะนำให้ทดลองหัวข้อด้วยโหมด `image` ก่อน หัวข้อไหนคนชอบค่อยทำเป็นโหมด `video`

**ชื่อตอน:** มีเลขลำดับนำหน้า เช่น `005-2026-11-20-dont-beg-for-attention` ตอนอ้างถึงใน prompt ใช้แค่เลข เช่น `ตอน 005` ก็ได้

---

## 1. ทำคลิปใหม่ 1 คลิป (ครบจนเรนเดอร์)

```
ทำคลิปใหม่ให้ช่อง love-quotes 1 คลิป โหมด [image / video]
หัวข้อ: [คิดถึงคนที่ไปแล้ว]
อารมณ์: [อบอุ่น / ปลอบใจ / มูฟออน]
ความยาว: ประมาณ [20] วินาที
ภาพ (โหมด image): [3] ภาพ ฉาก [ร้านกาแฟตอนฝนตก / ทะเลตอนเย็น / ...]
ตัวละครในภาพ: [ไม่มี / baitoey / somchun]
ทำครบด้วย produce.py แล้วดึงเฟรมมาเช็กซับให้ด้วย
```

## 2. ทำทีละหลายคลิป

```
ทำคลิปทดลอง [5] คลิปให้ช่อง love-quotes โหมด image
หัวข้อ: [ให้คิดเอง / หรือระบุ: มูฟออน, รักตัวเอง, รักที่ไม่สมหวัง, คนที่ใช่แต่ผิดเวลา, ขอบคุณคนที่เคยรัก]
ความยาวคลิปละประมาณ 20 วินาที
ตัวละครในภาพ: [ไม่มี / baitoey / somchun]
เขียนสคริปต์และ prompt ภาพทุกคลิปให้ผมดูก่อน
ผมอนุมัติแล้วค่อยสร้างภาพและเรนเดอร์
```

> ขอดูสคริปต์ก่อนเสมอเมื่อทำหลายคลิป เพราะ Codex และ ElevenLabs ใช้โควตาทุกครั้งที่สร้าง

## 2b. เปลี่ยนคลิปที่ได้ผลดีเป็นโหมดวิดีโอ

```
เปลี่ยนตอน [005] เป็นโหมด video ลิปซิงก์ [sync-2 / sync-2-pro]
ใช้สคริปต์และเสียงเดิม
```

## 2c. ทำตอนต่อของเรื่องต่อเนื่อง (แมวตีสอง)

```
ทำแมวตีสองตอนที่ [4] ตามแผนซีซั่นใน content/poc/cat-2am/series.md
ชื่อตอน: [แมวหาย]
ความยาว: ประมาณ [35] วินาที [8–9] ฉาก
หักมุมท้ายตอน: [ใช้ตามแผน / หรือระบุเอง: ...]
เขียน episode.json + script.md + publish.md ให้ดูก่อน ผมอนุมัติแล้วค่อยสร้างภาพและเรนเดอร์
```

> ซีรีส์นี้ตั้งค่าไว้ใน template แล้ว: ภาพการ์ตูน + ตัวละครส้มฉุน (`"characters": ["somchun"]`, `"narrator": "somchun"`) + ภาพตั้งต้นสไตล์ (`"style_anchor": true`), ซับด้านล่าง, parallax แบบครอปน้อย, เสียง Mind (`eleven_v4`)
> ทุกตอนต้องจบด้วยการหักมุมที่ยังไม่คลี่คลาย และแคปชันชี้ไปตอนถัดไป

## 3. เขียนสคริปต์อย่างเดียว

```
เขียนสคริปต์ love-quotes หัวข้อ [ ] อารมณ์ [ ]
ขอ: ประโยคเปิด, บทพูดแบ่งช่วงตามเวลา, ซับแยกบรรทัดสั้น, prompt ภาพแต่ละช่วง, ชื่อคลิป + แคปชัน + แฮชแท็ก
ใส่ audio tag ของ ElevenLabs ให้เข้ากับอารมณ์แต่ละช่วง
ตัวละครในภาพ: [ไม่มี / baitoey / somchun]
บันทึกเป็นตอนใหม่ไว้ แต่ยังไม่ต้องสร้างภาพหรือเรนเดอร์
หลีกเลี่ยงคำคมที่อ้างว่าเป็นของคนอื่นถ้าไม่รู้แหล่งที่มา
```

## 4. แก้คลิปที่มีอยู่แล้ว

```
แก้ตอน [001]:
- [เปลี่ยนประโยคปิดเป็น "..."]
- [ให้ช่วงเปิดพูดเบาลง / เพิ่มจังหวะหยุดก่อนประโยคสุดท้าย]
- [สร้างภาพที่ 2 ใหม่ให้อบอุ่นกว่านี้]
- [ตัดช่วง ... ออก (ใช้ skip ไม่ต้องทำลิปซิงก์ใหม่)]
- [ย้ายซับลงด้านล่าง / ตัวละครชิดขอบ ครอปน้อยลง / ใช้ซูมแบบเดิมแทน parallax]
แล้วเรนเดอร์ใหม่
```

## 4b. ตรวจบทหรือคลิปด้วยสกิล (ยังไม่แก้)

```
ตรวจตอน [001] ด้วยสกิล story-hook-framework และ vertical-edit-techniques
ขอตารางทีละกฎ (✅/⚠️/❌ + ช่วงที่ + วิธีแก้) ยังไม่ต้องแก้ไฟล์
```

> โหมด video: ถ้าแก้ข้อความ เสียงจะเปลี่ยนและต้องทำลิปซิงก์ใหม่ (เสียค่าลิปซิงก์อีกรอบ) ส่วนการตัดทั้งช่วงออกไม่เสียเพิ่ม

## 5. ปรับเสียงพากย์

```
ปรับเสียงพากย์ตอน [ ]:
- [ช้าลง / นุ่มขึ้น / มีอารมณ์มากขึ้นในช่วง body]
- ลองเสียงอื่นเทียบ: [voice_id ...]
ทำ sample แค่ประโยคเปิดให้ฟังเทียบก่อน ยังไม่ต้องเรนเดอร์ทั้งคลิป
```

## 6. ปรับสไตล์ทั้งช่อง

```
ปรับสไตล์ซีรีส์ love-quotes: [ซับใหญ่ขึ้น / ฟอนต์ ... / ใส่เพลง shared/music/xxx.mp3 / ภาพมืดลง / สีคำที่เน้น]
อัปเดต series.md, template และ renderer ให้ตรงกัน แล้วเรนเดอร์ตอน [ ] ใหม่ให้ดูเทียบ
```

## 7. เพิ่มซีรีส์ใหม่

```
เพิ่มซีรีส์ใหม่ชื่อ [daily-motivation]
แนว: [คำคมให้กำลังใจตอนเช้า]
รูปแบบ: [9:16 ไม่เกิน 60 วินาที]
เสียง: [elevenlabs voice_id ... / ใช้ Hammy เหมือน love-quotes]
สร้าง series.md, _template และโฟลเดอร์ output ตามโครงเดิม แล้วทำตอนตัวอย่างให้ 1 ตอน
```

---

## 8. สร้างรูปพิธีกร (Codex)

**พิธีกรปัจจุบันของ love-quotes:** **ใบเตย (baitoey)** สาวออฟฟิศใส่แว่นกรอบทอง มัดผมดังโงะ นั่งโซฟาในฐานะแขกรับเชิญของรายการทอล์กโชว์ ใช้ไมค์หนีบปกเสื้อ
- ภาพต้นแบบหน้า (ใช้กับ `--image`): `shared/characters/baitoey/reference/face-closeup.png`
- ฉาก: `shared/characters/baitoey/scenes/` ดูรายละเอียดใน `persona.md`
- ถ้าสั่งหน้าเดิมด้วย prompt 8.2 ให้แก้ฉากเป็น `talk-show interview set, seated on a sofa as a guest, small lavalier mic on the lapel, no big microphone`

### 8.1 สั่งผ่าน Claude: ฉากหรือชุดใหม่ หน้าเดิม (ใช้บ่อยที่สุด)
```
สร้างรูปใบเตย [2] ภาพด้วย Codex โดยใช้ shared/characters/baitoey/reference/face-closeup.png เป็นต้นแบบหน้า
หน้า แว่น ทรงผม และการแต่งหน้าต้องเหมือนเดิมทุกอย่าง
ฉาก: [โซฟาในรายการทอล์กโชว์ / มุมใกล้ / ไฟสลัวตอนดึก]
ชุด: สาวออฟฟิศเท่ ๆ [เช่น เบลเซอร์ครีม + เสื้อยืดขาว / สูทลายทาง / เชิ้ตดำ]
```

### 8.1b สั่งผ่าน Claude: สร้างพิธีกรคนใหม่
```
สร้างรูปพิธีกรใหม่ [3] แบบด้วย Codex
ลุค: [ผมยาวตรงสีดำ แสกกลาง แต่งหน้าโทนชมพู ผิวขาว]
อายุ: [27–29]
ชุดและฉาก: [สาวออฟฟิศเท่ ๆ นั่งโซฟาเป็นแขกรับเชิญ]
ต้องเป็นหน้าที่สร้างใหม่ทั้งหมด ไม่เหมือนคนจริง
```

> ถ้ามีรูปที่ชอบ ให้วางไว้ที่ `shared/characters/_inspiration/` (ไฟล์ในนี้ไม่ขึ้น git)
> Claude จะดูแค่สไตล์ เช่น ทรงผม การแต่งหน้า หรือบรรยากาศ แล้วเขียนเป็นข้อความ จะไม่ส่งรูปคนจริงไปให้ Codex

### 8.2 Prompt ภาษาอังกฤษ: หน้าเดิม เปลี่ยนชุดหรือฉาก (แนบภาพต้นแบบหน้าด้วย)
```
The attached image shows a fictional AI-generated podcast host. Create a photorealistic
vertical 9:16 portrait (1024x1536) of the SAME woman: keep her face, glasses, hairstyle,
skin tone and soft rosy makeup identical. Change only outfit and background.

Background: [a talk-show / video-podcast interview set, seated relaxed on a sofa as a guest,
warm wood-slat wall, floor lamp, plants, softly blurred studio camera at the edge],
shallow depth of field, cinematic warm grade.

Outfit: cool, confident modern office woman (smart and stylish, not stiff):
[black tailored blazer over a white tee], small black lavalier mic clipped on the lapel.

Framing (for lip-sync): waist-up or chest-up, face looking directly at the camera, face fully
visible and evenly lit, mouth closed with a gentle smile, hands relaxed and away from the face,
no big microphone, lower third calm for subtitles, no readable text, no logos.
```

**ไอเดียชุดสาวออฟฟิศเท่ ๆ** (ใช้แทนข้อความใน `[ ]` ได้)
- `tailored black blazer over a white silk camisole, thin gold necklace`
- `oversized charcoal-grey blazer with sleeves pushed up, black fitted turtleneck, minimal silver watch`
- `crisp light-blue button-up shirt, top button open, sleeves rolled`
- `cream double-breasted blazer over a plain white tee, small gold hoop earrings`
- `navy pinstripe suit jacket, white shirt with open collar, slim leather watch`
- `black satin shirt, sleeves rolled, delicate silver bracelet`

**ไอเดียฉาก**
- `dark green velvet sofa, moody evening set, dim warm lamps, a cup of tea on a side table`
- `cream boucle sofa, cozy living-room set, bookshelf, soft fairy-light bokeh`
- `close-up angle: tighter framing from shoulders up, set blurred heavily`

### 8.3 Prompt ภาษาอังกฤษ: สร้างพิธีกรคนใหม่ (ไม่แนบภาพ)
```
Photorealistic vertical 9:16 portrait (1024x1536) of an entirely fictional Thai/East-Asian
woman, age 27-29, a podcast host. Original invented face that does not resemble any real
person, celebrity or influencer.

Look: [long straight glossy black hair with a soft center part, fair luminous skin, soft
rosy-pink blush, gentle eyes with subtle brown eyeliner, natural lips with a muted rose tint],
confident yet warm aura.

[Background + Outfit + Framing ให้ใช้ข้อความชุดเดียวกับหัวข้อ 8.2]
```

### 8.4 คำสั่ง Codex แบบรันเอง
```powershell
# หน้าเดิม: ใส่ข้อความ prompt ก่อน แล้วค่อยตามด้วย --image
# ถ้าใส่ --image ก่อน prompt จะถูกอ่านเป็นชื่อไฟล์ภาพแทน
codex exec --skip-git-repo-check "<prompt 8.2>" --image "shared\characters\baitoey\reference\face-closeup.png"

# พิธีกรใหม่ (ไม่แนบภาพ)
codex exec --skip-git-repo-check "Use your image generation tool: <prompt 8.3>. Report the saved file path."
```
ภาพที่ได้จะอยู่ที่ `%USERPROFILE%\.codex\generated_images\` ให้คัดลอกมาเก็บไว้ในโฟลเดอร์ `shared/characters/<ชื่อ>/scenes/`

**เงื่อนไขของภาพที่จะใช้ทำลิปซิงก์:** หน้าตรง ปากปิด ไม่มีอะไรบังปากหรือคาง ไม่มีไมค์ใหญ่บังหน้า และมือไม่อยู่ใกล้หน้า

---

## 9. ตัวละครการ์ตูน (character sheet)

ตัวละครที่มีแล้ว: **ส้มฉุน (somchun)** แมวส้มอ้วน ตาง่วง ปลอกคอเขียว + กระดิ่ง ผู้เล่าเรื่องของแมวตีสอง
- character sheet: `shared/characters/somchun/reference/sheet.png` · บุคลิก: `persona.md`
- ใส่ใน `episode.json` → `"characters": ["somchun"]` แล้ว `images.py` จะต่อคำบรรยายตัวละครและแนบภาพอ้างอิงให้ Codex ทุกภาพ (`"narrator": "somchun"` = ใช้เสียงของตัวละคร) · ดู/แก้ได้ในเว็บหน้า "ตัวละคร"
- ตัวละครทั้งหมด: `shared/characters/README.md`

### 9.1 สั่งผ่าน Claude: สร้างตัวละครการ์ตูนใหม่
```
สร้าง character sheet ตัวละครการ์ตูนใหม่ด้วย Codex
ชื่อ: [ดำ]
ลักษณะ: [แมวดำแก่ ผอม ตาสีเหลือง หูขาดนิดหนึ่ง]
บุคลิก: [เงียบ ขี้ระแวง แต่ใจดี]
สไตล์: เหมือนส้มฉุน (การ์ตูน 2D ลงสีนุ่ม แสงอุ่นตอนกลางคืน)
เก็บไว้ที่ shared/characters/[ชื่อ]/ พร้อม persona.md
```

### 9.2 Prompt ภาษาอังกฤษ: character sheet
```
Use your image generation tool to create ONE image: an original cartoon character reference sheet,
vertical portrait 1024x1536, plain soft dark-blue background, no text, no letters, no logos.
Character "[name]": [look: body shape, colours, markings, eyes, accessories]. Personality: [ ].
Style: soft hand-painted 2D animated film look, clean shapes, gentle painterly shading, warm lamp light.
Layout: four poses of the SAME character - front view, side view walking, back view, face close-up.
Then report the saved file path.
```

**ทริคภาพการ์ตูน**
- คนในเรื่องไม่โชว์หน้า (มือ หลัง เงา) ภาพจะไม่เพี้ยนและคนดูอินแทนตัวเองได้
- ถ้า Codex วางตัวละครชิดขอบ: ลบไฟล์ภาพนั้นแล้วรัน `images.py` ใหม่ (สร้างเฉพาะภาพที่หาย) หรือเพิ่ม `"parallax": {"margin": 0.06}`
- ข้อความบนกระดาษ/ป้ายให้ใส่ใน `cards` (ซับ) แทน ภาพห้ามมีตัวอักษร

---

## เทคนิคเขียนบทสำหรับ ElevenLabs (eleven_v3)

| ต้องการ | เขียนในบทพูด (`text`) |
|---|---|
| พูดเบา นุ่ม | `[softly] บางครั้งการคิดถึง...` |
| อบอุ่น | `[warmly] วันนี้คุณกำลังคิดถึงใครอยู่` |
| กระซิบ | `[whispers] ...` |
| ถอนหายใจก่อนพูด | `[sighs] ...` |
| เว้นจังหวะ | ใช้ `...` หรือขึ้นประโยคใหม่ |

- tag ใส่ได้เฉพาะในช่อง `text` ที่ใช้ทำเสียง ช่อง `cards` ที่เป็นซับไม่ต้องใส่
- ใส่ tag ช่วงละ 1 ตัวก็พอ ใส่เยอะเสียงจะออกมาแปลก
- ถ้าระบบเปลี่ยนไปใช้ edge-tts แทน tag จะถูกลบออกอัตโนมัติ ไม่ถูกอ่านออกเสียง
- คลิป 20 วินาทีใช้ประมาณ 150–200 ตัวอักษร

## ทริคทั่วไป

- ยกตัวอย่างฉากให้ชัด เช่น "ร้านกาแฟตอนฝนตก" จะได้ภาพตรงใจกว่าคำว่า "เศร้า ๆ"
- ถ้าจะเปลี่ยนเสียงเฉพาะคลิปไหน ให้บอกใน prompt ว่า `เสียง: [voice_id]` หรือ `เสียง: edge Niwat`

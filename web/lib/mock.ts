import type { EpisodeDetail, Job, Post, Schedule } from "./types";

export const mockDate = "2026-11-22";
export const mockTime = "19:25";
export const mockSchedule: Schedule = {
  timezone: "Asia/Bangkok",
  slots: { tiktok: ["12:00", "19:00", "22:00"], youtube: ["12:00", "20:00"], facebook: ["20:00", "22:00"] },
  main_slot: "22:00",
  test_until: "2026-12-06",
};
export const mockSeries = ["love-quotes", "work-talk"];
export const seriesNames: Record<string, string> = { "love-quotes": "เรื่องความรัก", "work-talk": "เรื่องงาน" };

const fixtures = [
  [0, "001-2026-11-19-missing-without-returning", "คิดถึงได้ โดยไม่ต้องกลับไป", "image", "ความคิดถึงไม่ได้แปลว่าเราต้องกลับไปอยู่ตรงนั้น", "missing", "rendered"],
  [0, "003-2026-11-19-got-myself-back", "ฉันไม่ได้เสียเขาไป ฉันได้ตัวเองคืนมา", "video", "บางทีสิ่งที่ได้คืนมา คือเวลาที่เราได้ฟังเสียงตัวเอง", "self-love", "rendered"],
  [0, "004-2026-11-19-be-yourself", "สิ่งที่เหนื่อยที่สุดในความรัก", "video", "เหนื่อยไหมที่ต้องพยายามเป็นอีกคนทุกครั้งที่อยู่ด้วยกัน", "self-worth", "rendered"],
  [0, "005-2026-11-20-dont-beg-for-attention", "ถ้าต้องขอให้เขาสนใจ", "image", "ความใส่ใจที่ต้องคอยขอ อาจกำลังบอกอะไรเราอยู่", "self-worth", "posted"],
  [0, "010-2026-11-20-ordinary-days", "อยากมีคนอยู่ด้วยในวันธรรมดา", "image", "บางวันอยากมีแค่ใครสักคนกินข้าวเย็นด้วยกัน", "strong", "rendered"],
  [1, "001-2026-11-20-sunday-night-dread", "คืนวันอาทิตย์ที่ใจหวิว", "image", "ยังไม่ทันถึงวันจันทร์ ใจก็เดินไปถึงโต๊ะทำงานแล้ว", "anxiety", "rendered"],
  [1, "002-2026-11-20-tired-not-lazy", "ไม่ได้ขี้เกียจ แค่เหนื่อยมานาน", "image", "ลองให้ตัวเองได้พักสักคืนโดยไม่ต้องรู้สึกผิด", "strong", "rendered"],
  [1, "003-2026-11-20-boss-line-at-night", "หัวหน้าทักไลน์ตอนห้าทุ่ม", "image", "ข้อความเดียวก็ทำให้เวลาพักเหมือนหมดลงทันที", "boundaries", "posted"],
  [1, "004-2026-11-20-comparing-careers", "เพื่อนไปไกลแล้ว แต่เรายังอยู่ที่เดิม", "image", "เราเห็นปลายทางของคนอื่นพร้อมกับทางที่ตัวเองยังเดินอยู่", "comparison", "rendered"],
  [1, "005-2026-11-20-rest-is-work", "การพักก็เป็นส่วนหนึ่งของการทำงาน", "image", "คืนที่หยุดพักก็เป็นคืนที่เราดูแลแรงของตัวเอง", "rest", "draft"],
] as const;

const posts: Record<string, Post[]> = {
  "005-2026-11-20-dont-beg-for-attention": [
    { platform: "tiktok", date: mockDate, time: "12:00", url: "", views: 1280, likes: 94, saves: 18, source: "web" },
    { platform: "youtube", date: mockDate, time: "12:00", url: "", views: 430, likes: 21, saves: 4, source: "web" },
    { platform: "facebook", date: "2026-11-21", time: "22:00", url: "", views: 312, likes: 16, saves: 3, video_id: "mock-video-005", source: "publish_fb" },
  ],
  "003-2026-11-20-boss-line-at-night": [
    { platform: "tiktok", date: mockDate, time: "19:00", url: "", views: 642, likes: 37, saves: 8, source: "web" },
  ],
};

export const mockEpisodes: EpisodeDetail[] = fixtures.map(([seriesIndex, slug, title, mode, line, tag, status]) => {
  const series = mockSeries[seriesIndex];
  const fence = "```";
  const hashtags = seriesIndex === 0 ? "#ตอนตีสอง #เรื่องความรัก" : "#ตอนตีสอง #ชีวิตทำงาน";
  return {
    id: series + "/" + slug, series, slug, title, tags: [tag], mode, status,
    videoUrl: status === "draft" ? null : "/demo/" + slug + ".mp4",
    posterUrl: status === "draft" ? null : "/demo/" + slug + ".jpg",
    posts: posts[slug] ?? [],
    segments: [{ id: "hook", text: title }, { id: "body", text: line }, { id: "close", text: "คืนนี้ค่อย ๆ วางเรื่องนี้ลงก็ได้นะ" }],
    script: "# " + title + "\n\n" + line + "\n\nคืนนี้ค่อย ๆ วางเรื่องนี้ลงก็ได้นะ",
    publish: [
      "## YouTube Shorts", "**ชื่อคลิป:**", fence, title + " 🌙 #shorts", fence,
      "**คำอธิบาย:**", fence, line + "\n\n" + hashtags + " #shorts", fence,
      "- **เพลย์ลิสต์:** ตอนตีสอง · " + seriesNames[series],
      "- **ผู้ชม:** ไม่ได้สร้างมาเพื่อเด็ก · ไม่จำกัดอายุ",
      "- **เนื้อหาที่มีการดัดแปลง:** เปิด",
      "## TikTok", "**แคปชัน:**", fence, title + " 🌙\n" + line + "\n\n" + hashtags, fence,
      "- **ข้อความหน้าปก:** " + title, "- **ป้ายกำกับเนื้อหาที่สร้างโดย AI:** เปิด",
      "## Facebook Reels", "**แคปชัน:**", fence, line + "\n\nคืนนี้คุณกำลังคิดเรื่องอะไรอยู่บ้าง? 🤍\n\n" + hashtags, fence,
      "- **ป้ายกำกับ AI info:** เปิด", "- **แชร์ลงฟีดเพจ:** เปิด",
    ].join("\n"),
  };
});

export const mockJobs: Job[] = [
  { id: "20261122-191200-ab12", type: "produce", args: { episode: "content/work-talk/episodes/" + mockEpisodes[9].slug }, episodeId: mockEpisodes[9].id, status: "running", created_at: "2026-11-22T19:12:00+07:00", started_at: "2026-11-22T19:12:02+07:00", finished_at: null, exit_code: null, log: ["กำลังเตรียมเสียงบรรยาย", "กำลังประกอบวิดีโอแนวตั้ง"] },
  { id: "20261122-185000-cd34", type: "catalog", args: { series: "love-quotes" }, status: "done", created_at: "2026-11-22T18:50:00+07:00", started_at: "2026-11-22T18:50:01+07:00", finished_at: "2026-11-22T18:50:04+07:00", exit_code: 0, log: ["อัปเดตแค็ตตาล็อกเรื่องความรักสำเร็จ"] },
  { id: "20261122-184000-ef56", type: "produce", args: { episode: "content/work-talk/episodes/" + mockEpisodes[7].slug }, episodeId: mockEpisodes[7].id, status: "failed", created_at: "2026-11-22T18:40:00+07:00", started_at: "2026-11-22T18:40:01+07:00", finished_at: "2026-11-22T18:40:18+07:00", exit_code: 1, log: ["เริ่มตรวจไฟล์ภาพ", "ไม่พบภาพประกอบสำหรับตอนนี้"] },
];

import "server-only";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { listEpisodes, resolveEpisode, createJob, episodeDir } from "./repo";

/** A TTS voice the user can pick for an episode (shorts; story mode sets voices per language). */
export type VoiceOption = {
  key: string; tts: "edge" | "elevenlabs"; voice: string; model: string | null;
  name: string; detail: string; sample: string | null; usedBy: number;
};

const EDGE: { voice: string; name: string; detail: string }[] = [
  { voice: "th-TH-PremwadeeNeural", name: "Premwadee", detail: "edge-tts · หญิง · ฟรี" },
  { voice: "th-TH-NiwatNeural", name: "Niwat", detail: "edge-tts · ชาย · ฟรี" },
];
const MODELS = ["eleven_v3", "eleven_v4"]; // Thai works with v3/v4 only (CLAUDE.md)

type Eleven = { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string; category?: string };
let elevenCache: { at: number; voices: Eleven[] } | null = null;
async function elevenVoices(): Promise<Eleven[]> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return [];
  if (elevenCache && Date.now() - elevenCache.at < 10 * 60_000) return elevenCache.voices;
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key }, cache: "no-store" });
    const voices = res.ok ? ((await res.json()).voices as Eleven[]) : [];
    elevenCache = { at: Date.now(), voices };
    return voices;
  } catch { return elevenCache?.voices ?? []; }
}

/** First recorded clip of an episode that uses this voice: a sample in the channel's own words. */
async function ownSamples() {
  const samples = new Map<string, { url: string; count: number }>();
  for (const ep of await listEpisodes()) {
    if (ep.mode === "story") continue;
    let raw: { tts?: string; voice?: string; model?: string };
    try { raw = JSON.parse(await fs.readFile(path.join(episodeDir(ep.series, ep.slug), "episode.json"), "utf-8")); } catch { continue; }
    const key = [raw.tts ?? "edge", raw.voice ?? "th-TH-PremwadeeNeural", raw.tts === "elevenlabs" ? raw.model ?? "eleven_v3" : ""].join("|");
    const audioDir = path.join(episodeDir(ep.series, ep.slug), "audio");
    const clip = existsSync(audioDir) ? (await fs.readdir(audioDir)).filter(f => /^\d\d-.+\.mp3$/.test(f)).sort()[0] : undefined;
    const current = samples.get(key) ?? { url: "", count: 0 };
    samples.set(key, { url: current.url || (clip ? `/api/asset/${ep.id}?f=audio/${clip}` : ""), count: current.count + 1 });
  }
  return samples;
}

export async function listVoices(): Promise<VoiceOption[]> {
  const [own, eleven] = await Promise.all([ownSamples(), elevenVoices()]);
  const out: VoiceOption[] = [];
  for (const v of EDGE) {
    const key = `edge|${v.voice}|`;
    out.push({ key, tts: "edge", voice: v.voice, model: null, name: v.name, detail: v.detail, sample: own.get(key)?.url || null, usedBy: own.get(key)?.count ?? 0 });
  }
  const seen = new Set<string>();
  const add = (id: string, name: string, labels: Record<string, string> | undefined, preview: string | undefined) => {
    for (const model of MODELS) {
      const key = `elevenlabs|${id}|${model}`;
      const usage = own.get(key);
      out.push({ key, tts: "elevenlabs", voice: id, model, name,
        detail: ["ElevenLabs " + model.replace("eleven_", ""), labels?.gender, labels?.accent, labels?.description || labels?.descriptive].filter(Boolean).join(" · "),
        sample: usage?.url || preview || null, usedBy: usage?.count ?? 0 });
    }
    seen.add(id);
  };
  for (const v of eleven) add(v.voice_id, v.name, v.labels, v.preview_url);
  // voices used in episodes but not in the account library (e.g. removed) still show up
  for (const key of own.keys()) {
    const [tts, id] = key.split("|");
    if (tts === "elevenlabs" && !seen.has(id)) add(id, id.slice(0, 8) + "…", undefined, undefined);
  }
  // used voices first, then by name
  return out.sort((a, b) => (b.usedBy > 0 ? 1 : 0) - (a.usedBy > 0 ? 1 : 0) || a.name.localeCompare(b.name));
}

/** Switch an episode's voice; tts.py's cache key includes tts/voice/model, so the voice job re-records every segment. */
/** record=false (images step): only set the voice; the voice step records it later. */
export async function setEpisodeVoice(series: string, slug: string, choice: { tts: string; voice: string; model?: string | null; record?: boolean }) {
  const dir = await resolveEpisode(series, slug);
  if (!dir) throw new Error("episode not found");
  if (!["edge", "elevenlabs"].includes(choice.tts) || !/^[A-Za-z0-9_-]{6,64}$/.test(choice.voice)) throw new Error("bad voice");
  if (choice.tts === "elevenlabs" && !MODELS.includes(String(choice.model))) throw new Error("bad model");
  const file = path.join(dir, "episode.json");
  const data = JSON.parse(await fs.readFile(file, "utf-8"));
  if (data.mode === "story") throw new Error("story mode: voices are set per language");
  data.tts = choice.tts;
  data.voice = choice.voice;
  if (choice.tts === "elevenlabs") data.model = choice.model; else delete data.model;
  const tmp = file + ".voice.tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, file);
  return choice.record === false ? { ok: true } : createJob("voice", { episode: series + "/" + slug });
}

export function currentVoiceKey(raw: { tts?: string; voice?: string; model?: string }) {
  return [raw.tts ?? "edge", raw.voice ?? "th-TH-PremwadeeNeural", raw.tts === "elevenlabs" ? raw.model ?? "eleven_v3" : ""].join("|");
}

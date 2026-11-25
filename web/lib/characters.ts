import "server-only";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, listSeries, seriesPath } from "./repo";

/** Reusable characters: shared/characters/<name>/ (persona.md = human bible, character.json = machine side, see tools/characters.py). */
export type CharacterVoice = { tts?: string; voice?: string; model?: string; fallback?: Record<string, string> };
export type CharacterFile = { name: string; url: string };
export type CharacterUse = { series: string; slug: string; as: string[] };
export type Character = {
  name: string;
  displayName: string;
  imageBlock: string;
  refs: string[];
  voice: CharacterVoice;
  samples: Record<string, string>;
  persona: string;
  references: CharacterFile[];
  voiceSamples: CharacterFile[];
  usedBy: CharacterUse[];
  hasJson: boolean;
};
export type CharacterUpdate = { image_block?: string; samples?: Record<string, string>; voice?: { voice?: string; model?: string } };

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILE_RE = /^(reference|voice-samples)\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp|mp3)$/;
const DIR = path.join(ROOT, "shared", "characters");
const MAX_TEXT = 4000;

const charDir = (name: string) => path.join(DIR, name);
const fileUrl = (name: string, rel: string) => `/api/characters/${name}?f=${encodeURIComponent(rel)}`;

async function listFiles(name: string, sub: string, exts: RegExp): Promise<CharacterFile[]> {
  const dir = path.join(charDir(name), sub);
  if (!existsSync(dir)) return [];
  return (await fs.readdir(dir)).filter(f => exts.test(f)).sort().map(f => ({ name: f, url: fileUrl(name, `${sub}/${f}`) }));
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  try { return JSON.parse(await fs.readFile(file, "utf-8")); } catch { return null; }
}

/** Episodes that use each character (characters / narrator / host.character keys). */
async function usage(): Promise<Map<string, CharacterUse[]>> {
  const out = new Map<string, CharacterUse[]>();
  for (const series of await listSeries()) {
    const eps = path.join(ROOT, "content", seriesPath(series), "episodes");
    if (!existsSync(eps)) continue;
    for (const slug of await fs.readdir(eps)) {
      const ep = await readJson(path.join(eps, slug, "episode.json"));
      if (!ep) continue;
      const roles = new Map<string, string[]>();
      const add = (who: unknown, role: string) => { if (typeof who === "string") roles.set(who, [...(roles.get(who) ?? []), role]); };
      (Array.isArray(ep.characters) ? ep.characters : []).forEach(c => add(c, "ภาพ"));
      add(ep.narrator, "เสียง");
      add((ep.host as { character?: unknown } | undefined)?.character, "พิธีกร");
      for (const [who, as] of roles) out.set(who, [...(out.get(who) ?? []), { series, slug, as }]);
    }
  }
  return out;
}

async function load(name: string, uses: Map<string, CharacterUse[]>): Promise<Character> {
  const json = await readJson(path.join(charDir(name), "character.json"));
  const personaFile = path.join(charDir(name), "persona.md");
  return {
    name,
    displayName: typeof json?.name === "string" ? json.name : name,
    imageBlock: typeof json?.image_block === "string" ? json.image_block : "",
    refs: Array.isArray(json?.refs) ? (json.refs as string[]) : [],
    voice: (json?.voice as CharacterVoice) ?? {},
    samples: (json?.samples as Record<string, string>) ?? {},
    persona: existsSync(personaFile) ? await fs.readFile(personaFile, "utf-8") : "",
    references: await listFiles(name, "reference", /\.(png|jpe?g|webp)$/i),
    voiceSamples: await listFiles(name, "voice-samples", /\.mp3$/i),
    usedBy: uses.get(name) ?? [],
    hasJson: json !== null,
  };
}

export async function listCharacters(): Promise<Character[]> {
  if (!existsSync(DIR)) return [];
  const uses = await usage();
  const names = (await fs.readdir(DIR, { withFileTypes: true })).filter(e => e.isDirectory() && NAME_RE.test(e.name)).map(e => e.name).sort();
  return Promise.all(names.map(n => load(n, uses)));
}

export async function getCharacter(name: string): Promise<Character | null> {
  if (!NAME_RE.test(name) || !existsSync(charDir(name))) return null;
  return load(name, await usage());
}

/** Validated path of a reference image or voice sample, or null. */
export function characterFile(name: string, rel: string) {
  if (!NAME_RE.test(name) || !FILE_RE.test(rel)) return null;
  const full = path.join(charDir(name), rel);
  return existsSync(full) ? full : null;
}

const cleanText = (v: unknown) => typeof v === "string" && v.trim() && v.length <= MAX_TEXT ? v.trim() : null;

/** Update the editable fields of character.json (image block, voice id/model, sample lines). Returns an error message or null. */
export async function updateCharacter(name: string, body: CharacterUpdate): Promise<string | null> {
  if (!NAME_RE.test(name)) return "ชื่อตัวละครไม่ถูกต้อง";
  const file = path.join(charDir(name), "character.json");
  const json = await readJson(file);
  if (!json) return "ยังไม่มี character.json";
  let next: Record<string, unknown> = { ...json };
  if (body.image_block !== undefined) {
    const block = cleanText(body.image_block);
    if (!block) return "Image block ว่างหรือยาวเกินไป";
    next = { ...next, image_block: block };
  }
  if (body.samples !== undefined) {
    const entries = Object.entries(body.samples ?? {});
    if (entries.some(([k, v]) => !NAME_RE.test(k) || !cleanText(v))) return "ประโยคตัวอย่าง: ชื่ออารมณ์ต้องเป็นภาษาอังกฤษตัวเล็ก และข้อความห้ามว่าง";
    next = { ...next, samples: Object.fromEntries(entries.map(([k, v]) => [k, v.trim()])) };
  }
  if (body.voice !== undefined) {
    const voice = { ...((json.voice as CharacterVoice) ?? {}) };
    const id = body.voice.voice?.trim(), model = body.voice.model?.trim();
    if (id !== undefined && !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return "voice_id ไม่ถูกต้อง";
    if (model !== undefined && !/^[a-z0-9_]{1,40}$/.test(model)) return "model ไม่ถูกต้อง";
    next = { ...next, voice: { ...voice, ...(id !== undefined && { voice: id }), ...(model !== undefined && { model }) } };
  }
  const tmp = file + "." + process.pid + "." + Date.now() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, file);
  return null;
}

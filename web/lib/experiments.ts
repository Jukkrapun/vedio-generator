import "server-only";
import { existsSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./repo";

/** Standalone experiments: folders under content/poc/ without series.md (e.g. parallax).
 *  Their notes are content/poc/<name>/README.md, their results output/poc/<name>/*. */
export type ExperimentFile = { name: string; kind: "video" | "image"; size: number; mtime: string; url: string };
export type Experiment = { name: string; readme: string; files: ExperimentFile[] };

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILE_RE = /^[A-Za-z0-9._-]+\.(mp4|png|jpg|jpeg|webp)$/;
const POC = path.join(ROOT, "content", "poc");
const OUT = path.join(ROOT, "output", "poc");

export async function listExperiments(): Promise<Experiment[]> {
  if (!existsSync(POC)) return [];
  const out: Experiment[] = [];
  for (const entry of await fs.readdir(POC, { withFileTypes: true })) {
    const name = entry.name;
    if (!entry.isDirectory() || !NAME_RE.test(name) || name === "episodes" || existsSync(path.join(POC, name, "series.md"))) continue;
    const readme = existsSync(path.join(POC, name, "README.md")) ? await fs.readFile(path.join(POC, name, "README.md"), "utf-8") : "";
    const dir = path.join(OUT, name);
    const files = existsSync(dir) ? (await fs.readdir(dir)).filter(f => FILE_RE.test(f)).sort().map(f => {
      const st = statSync(path.join(dir, f));
      return { name: f, kind: f.endsWith(".mp4") ? "video" : "image", size: st.size, mtime: st.mtime.toISOString(), url: `/api/experiments/${name}?f=${encodeURIComponent(f)}` } satisfies ExperimentFile;
    }) : [];
    out.push({ name, readme, files });
  }
  return out;
}

/** Validated path of one result file, or null. */
export function experimentFile(name: string, file: string) {
  if (!NAME_RE.test(name) || !FILE_RE.test(file)) return null;
  const full = path.join(OUT, name, file);
  return existsSync(full) ? full : null;
}

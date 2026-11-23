import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, listSeries } from "./repo";

/** A clip-making prompt from PROMPTS.md: "## n. title" + its first fenced block. */
export type TemplateField = { key: string; label: string; example?: string; options: string[] | null; series?: boolean };
export type Template = { id: string; title: string; body: string; fields: TemplateField[] };

// Only sections that make new clips become order templates (the rest edit existing ones or the channel).
const CLIP_HEADING = /^[0-9]+[a-z]?\.\s*(ทำ|เขียน)/;  // 1. ทำคลิปใหม่, 2. ทำทีละหลายคลิป, 3. เขียนสคริปต์
const HIDDEN_OPTIONS = new Set(["video"]); // lip-sync POC paused (CLAUDE.md, 2026-11-23)

export async function loadTemplates(): Promise<Template[]> {
  const text = (await fs.readFile(path.join(ROOT, "PROMPTS.md"), "utf-8")).replace(/\r/g, "");
  const series = await listSeries();
  const out: Template[] = [];
  for (const section of text.split(/^## /m).slice(1)) {
    const [heading] = section.split("\n");
    const block = section.match(/```[a-z]*\n([\s\S]*?)```/)?.[1];
    const id = heading.match(/^([0-9]+[a-z]?)\./)?.[1];
    if (!block || !id || !CLIP_HEADING.test(heading)) continue;
    const fields: TemplateField[] = [];
    let body = block.trim();
    // series names in the example become a series select
    const seriesName = series.find(name => body.includes(name));
    if (seriesName) {
      body = body.split(seriesName).join("{{series}}");
      fields.push({ key: "series", label: "ซีรีส์", options: series, series: true });
    }
    let n = 0;
    body = body.replace(/\[([^\]]*)\]/g, (_match: string, inner: string, offset: number, whole: string) => {
      const key = "f" + n++;
      const parts = inner.split("/").map(part => part.trim()).filter(part => part && part !== "...");
      const options = parts.length > 1 ? parts.filter(part => !HIDDEN_OPTIONS.has(part)) : null;
      // label = the word just before the bracket on its line ("หัวข้อ: [..]" -> "หัวข้อ"); the bracket text is the example
      const line = whole.slice(whole.lastIndexOf("\n", offset) + 1, offset).replace(/\{\{\w+\}\}|\[[^\]]*\]/g, " ");
      const before = line.replace(/[:\-\s]+$/, "").split(/\s+/).filter(Boolean).at(-1) ?? "";
      fields.push({ key, label: before || inner.trim() || "ระบุ", example: inner.trim(), options });
      return "{{" + key + "}}";
    });
    out.push({ id, title: heading.replace(/^[0-9]+[a-z]?\.\s*/, "").trim(), body, fields });
  }
  return out;
}

export function fillTemplate(template: Template, values: Record<string, string>) {
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (values[key] ?? "").trim());
}

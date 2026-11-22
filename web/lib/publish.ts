import { platforms, type Platform } from "./types";

export type PublishField = { label: string; value: string; block?: boolean };
export function parsePublish(markdown: string): Record<Platform, PublishField[]> {
  const fields: Record<Platform, PublishField[]> = { tiktok: [], youtube: [], facebook: [] };
  let platform: Platform | undefined;
  let label = "ข้อความ";
  let block: string[] | null = null;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      if (block && platform) fields[platform].push({ label, value: block.join("\n"), block: true });
      block = block ? null : [];
      continue;
    }
    if (block) { block.push(line); continue; }
    if (line.startsWith("## ")) {
      platform = platforms.find(key => line.toLowerCase().includes(key));
      label = "ข้อความ";
      continue;
    }
    if (!platform) continue;
    const field = line.match(/^(?:- )?\*\*([^*]+)\*\*(.*)$/);
    if (field) {
      label = field[1].replace(/:$/, "");
      const value = field[2].trim().replace(/^:\s*/, "");
      if (value && !/^\(.*\):$/.test(value)) fields[platform].push({ label, value });
    } else {
      const setting = line.match(/^- ([^:]+):\s*(.+)$/);
      if (setting) fields[platform].push({ label: setting[1], value: setting[2] });
    }
  }
  return fields;
}

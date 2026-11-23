import { handle } from "@/lib/api";
import { createOrder, listOrders, listSeries } from "@/lib/repo";
import { loadTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const GET = () => handle(listOrders);

/** Body {template, prompt, title?, series?}: the filled PROMPTS.md template (possibly edited by the user). */
export const POST = (request: Request) => handle(async () => {
  const { template, prompt, title, series } = await request.json();
  const found = (await loadTemplates()).find(t => t.id === template);
  if (!found) throw new Error("unknown template");
  const text = String(prompt ?? "").trim();
  if (!text || text.length > 8000) throw new Error("prompt is empty or too long");
  const knownSeries = await listSeries();
  return createOrder({ template: found.id, title: String(title || found.title), series: knownSeries.includes(series) ? series : "", prompt: text });
});

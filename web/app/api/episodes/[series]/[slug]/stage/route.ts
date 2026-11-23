import { handle } from "@/lib/api";
import { stageAction, type StageAction } from "@/lib/repo";
import type { Stage } from "@/lib/types";

const ACTIONS: StageAction[] = ["approve", "all", "drop", "restore", "back"];

/** Body {action: approve|all|drop|restore|back, target?: stage} — see docs/ops-dashboard/PIPELINE.md. */
export const POST = (request: Request, { params }: { params: Promise<{ series: string; slug: string }> }) => handle(async () => {
  const { series, slug } = await params;
  const { action, target } = await request.json();
  if (!ACTIONS.includes(action)) throw new Error("bad action");
  return stageAction(series, slug, action, target as Stage | undefined);
});

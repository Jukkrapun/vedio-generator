import { handle } from "@/lib/api";
import { updateScript } from "@/lib/repo";

/** Body {segments?: [{id, text?, cards?, image_prompt?}], publish?, title?} */
export const PATCH = (request: Request, { params }: { params: Promise<{ series: string; slug: string }> }) => handle(async () => {
  const { series, slug } = await params;
  await updateScript(series, slug, await request.json());
});

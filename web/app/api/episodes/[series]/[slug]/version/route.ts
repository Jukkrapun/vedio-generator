import { handle } from "@/lib/api";
import { deleteVersion, selectVersion } from "@/lib/repo";

type Params = { params: Promise<{ series: string; slug: string }> };

/** Body {version: "<id>" | null}: pin the take used for posting (null = newest take of the current mode). */
export const PUT = (request: Request, { params }: Params) => handle(async () => {
  const { series, slug } = await params;
  const { version } = await request.json();
  await selectVersion(series, slug, version ? String(version) : null);
});

/** ?v=<id>: delete an unused take. */
export const DELETE = (request: Request, { params }: Params) => handle(async () => {
  const { series, slug } = await params;
  await deleteVersion(series, slug, new URL(request.url).searchParams.get("v") ?? "");
});

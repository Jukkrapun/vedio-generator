import { handle } from "@/lib/api";
import { cancelJob, getJob } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export const GET = (_: Request, { params }: Params) => handle(async () => {
  const job = await getJob((await params).id);
  if (!job) throw new Error("job not found");
  return job;
});
export const DELETE = (_: Request, { params }: Params) => handle(async () => cancelJob((await params).id));

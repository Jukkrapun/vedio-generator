import { handle } from "@/lib/api";
import { createJob, listJobs } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const GET = () => handle(() => listJobs());
export const POST = (request: Request) => handle(async () => {
  const { type, args } = await request.json();
  return createJob(type, args ?? {});
});

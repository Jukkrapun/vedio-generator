import { handle } from "@/lib/api";
import { listExperiments } from "@/lib/experiments";
export const dynamic = "force-dynamic";
export const GET = () => handle(listExperiments);

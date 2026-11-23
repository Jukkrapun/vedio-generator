import { handle } from "@/lib/api";
import { workerInfo } from "@/lib/repo";
export const dynamic = "force-dynamic";
export const GET = () => handle(workerInfo);

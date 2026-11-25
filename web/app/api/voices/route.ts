import { handle } from "@/lib/api";
import { listVoices } from "@/lib/voices";
export const dynamic = "force-dynamic";
export const GET = () => handle(listVoices);

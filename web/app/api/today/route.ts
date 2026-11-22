import { handle } from "@/lib/api";
import { getToday } from "@/lib/data";
export const dynamic = "force-dynamic";
export const GET = () => handle(getToday);

import { handle } from "@/lib/api";
import { loadTemplates } from "@/lib/templates";
export const dynamic = "force-dynamic";
export const GET = () => handle(loadTemplates);

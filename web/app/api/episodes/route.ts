import { handle } from "@/lib/api";
import { listEpisodes } from "@/lib/repo";
export const dynamic = "force-dynamic";
export const GET = () => handle(listEpisodes);

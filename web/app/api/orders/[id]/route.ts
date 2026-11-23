import { handle } from "@/lib/api";
import { getOrder } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) => handle(async () => {
  const order = await getOrder((await params).id);
  if (!order) throw new Error("order not found");
  return order;
});

import Link from "next/link";
import { Empty } from "@/components/common";
import { OrderScreen } from "@/components/pipeline";
import { getOrder } from "@/lib/repo";

export const metadata = { title: "รายละเอียดงาน" };
export const dynamic = "force-dynamic";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id);
  if (!order) return <><Link className="back-link" href="/jobs">งานทั้งหมด</Link><Empty>ไม่พบงานนี้</Empty></>;
  return <OrderScreen key={order.id} initial={order} />;
}

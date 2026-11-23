import { OrdersScreen } from "@/components/pipeline";
import { listOrders } from "@/lib/repo";
import { loadTemplates } from "@/lib/templates";

export const metadata = { title: "งาน" };
export const dynamic = "force-dynamic";
export default async function JobsPage() {
  const [orders, templates] = await Promise.all([listOrders(), loadTemplates()]);
  return <OrdersScreen initial={orders} templates={templates} />;
}

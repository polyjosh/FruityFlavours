import { getAdminOrders } from "@/lib/server/orders";
import { toAdminOrderView } from "@/lib/server/admin-views";
import { OrdersBoard } from "@/components/admin/OrdersBoard";

export default async function AdminOrdersPage() {
  const { orders, counts, latest } = await getAdminOrders("action", "");
  return <OrdersBoard initial={{ orders: orders.map(toAdminOrderView), counts, latest: latest ? toAdminOrderView(latest) : null }} />;
}

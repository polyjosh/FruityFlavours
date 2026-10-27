import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/http";
import { getAdminOrders, type AdminOrderFilter } from "@/lib/server/orders";
import { toAdminOrderView } from "@/lib/server/admin-views";

const FILTERS: AdminOrderFilter[] = ["action", "today", "delivery", "pickup", "all"];

export const GET = adminRoute(async (req: Request) => {
  const url = new URL(req.url);
  const f = url.searchParams.get("filter") as AdminOrderFilter;
  const filter = FILTERS.includes(f) ? f : "action";
  const { orders, counts, latest } = await getAdminOrders(filter, url.searchParams.get("q") ?? "");
  return NextResponse.json({ orders: orders.map(toAdminOrderView), counts, latest: latest ? toAdminOrderView(latest) : null });
});

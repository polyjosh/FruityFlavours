import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, parseJson } from "@/lib/server/http";
import { getOrder, updateOrderStatus } from "@/lib/server/orders";
import { toAdminOrderView } from "@/lib/server/admin-views";
import { ORDER_STATUSES } from "@/lib/shared/status";

const schema = z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]) });

/** Change an order's status. The customer gets an SMS for the new status. */
export const PATCH = adminRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { data, error } = await parseJson(req, schema);
  if (error) return error;
  if (!(await getOrder(id))) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  await updateOrderStatus(id, data.status as (typeof ORDER_STATUSES)[number]);
  return NextResponse.json({ order: toAdminOrderView((await getOrder(id))!) });
});

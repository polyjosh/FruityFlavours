import { adminRoute } from "@/lib/server/http";
import { getReportOrders } from "@/lib/server/orders";
import { resolveReportRange } from "@/lib/server/reports";
import { salesCsv } from "@/lib/shared/reports";

/** Sales export, one row per order line, with the same filters as the Reports screen. */
export const GET = adminRoute(async (req: Request) => {
  const range = await resolveReportRange(Object.fromEntries(new URL(req.url).searchParams));
  const orders = await getReportOrders(range.from, range.to);
  const csv = salesCsv(orders, range.category);
  const name = `fruityflavours-sales-${range.fromKey}-to-${range.toKey}${range.category ? `-${range.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.csv`;
  return new Response("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
});

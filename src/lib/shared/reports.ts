import { addDays, dayKey } from "./dates";
import { formatLocalPhone } from "./phone";

export interface ReportItem {
  productName: string;
  productType: "drink" | "other";
  categoryName: string;
  bottlesCount: number | null;
  quantity: number;
  lineTotal: number;
}

export interface ReportOrder {
  createdAt: Date;
  fulfilment: "delivery" | "pickup";
  paymentMethod: string;
  deliveryFee: number;
  items: ReportItem[];
}

export interface SalesReport {
  revenue: number;
  orders: number;
  bottles: number;
  otherUnits: number;
  averageOrder: number;
  deliveryFees: number;
  deliveries: number;
  pickups: number;
  payment: { mpesa: number; delivery: number; pickup: number };
  days: { key: string; revenue: number }[];
  top: { name: string; type: string; units: number; revenue: number }[];
}

/**
 * Aggregates report figures. `category` null = all products.
 * Revenue is product sales only (delivery fees are reported separately, and only for all products).
 * Only orders with at least one line in the category count.
 */
export function buildSalesReport(orders: ReportOrder[], category: string | null, fromKey: string, toKey: string): SalesReport {
  const days = new Map<string, number>();
  for (let k = fromKey; k <= toKey; k = addDays(k, 1)) days.set(k, 0);

  const top = new Map<string, { name: string; type: string; units: number; revenue: number }>();
  const r = { revenue: 0, orders: 0, bottles: 0, otherUnits: 0, deliveryFees: 0, deliveries: 0, pickups: 0 };
  const payment = { mpesa: 0, delivery: 0, pickup: 0 };

  for (const o of orders) {
    const items = category ? o.items.filter((i) => i.categoryName === category) : o.items;
    if (items.length === 0) continue;
    const sales = items.reduce((s, i) => s + i.lineTotal, 0);
    r.orders++;
    r.revenue += sales;
    if (o.fulfilment === "delivery") {
      r.deliveries++;
      r.deliveryFees += o.deliveryFee;
    } else r.pickups++;
    if (o.paymentMethod === "mpesa") payment.mpesa++;
    else if (o.fulfilment === "delivery") payment.delivery++;
    else payment.pickup++;

    const key = dayKey(o.createdAt);
    days.set(key, (days.get(key) ?? 0) + sales);

    for (const i of items) {
      if (i.productType === "drink") r.bottles += (i.bottlesCount ?? 1) * i.quantity;
      else r.otherUnits += i.quantity;
      const t = top.get(i.productName) ?? { name: i.productName, type: i.categoryName, units: 0, revenue: 0 };
      t.units += i.quantity;
      t.revenue += i.lineTotal;
      top.set(i.productName, t);
    }
  }

  return {
    ...r,
    averageOrder: r.orders ? Math.round(r.revenue / r.orders) : 0,
    payment,
    days: [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, revenue]) => ({ key, revenue })),
    top: [...top.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

/** Whole-number percentages that add up to 100 (largest remainder). */
export function percentages(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    floors[i]++;
  }
  return floors;
}

export interface CsvOrder extends ReportOrder {
  orderNo: number;
  customerName: string;
  customerPhone: string;
  deliveryAddressText: string | null;
  pickupPointName: string | null;
  lat: number | null;
  lng: number | null;
  paymentStatus: string;
  status: string;
  items: (ReportItem & { optionLabel: string; unitPrice: number })[];
}

const csvCell = (v: string | number) => {
  const s = String(v);
  // Quote when needed; prefix formula-like values so spreadsheets don't execute them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** One row per order line, respecting the same filters as the report. */
export function salesCsv(orders: CsvOrder[], category: string | null): string {
  const header = ["Order", "Date", "Customer", "Phone", "Product", "Category", "Option", "Quantity", "Unit price", "Line total", "Delivery or pickup", "Location", "Payment", "Status"];
  const rows = [header];
  for (const o of orders) {
    const location =
      o.fulfilment === "delivery"
        ? [o.deliveryAddressText, o.lat !== null && o.lng !== null ? `${o.lat},${o.lng}` : null].filter(Boolean).join(" · ")
        : (o.pickupPointName ?? "");
    for (const i of o.items) {
      if (category && i.categoryName !== category) continue;
      rows.push([
        `FF-${o.orderNo}`,
        dayKey(o.createdAt),
        o.customerName,
        formatLocalPhone(o.customerPhone),
        i.productName,
        i.categoryName,
        i.optionLabel,
        String(i.quantity),
        String(i.unitPrice),
        String(i.lineTotal),
        o.fulfilment === "delivery" ? "Delivery" : "Pickup",
        location,
        o.paymentMethod === "mpesa" ? `M-Pesa (${o.paymentStatus})` : o.fulfilment === "delivery" ? "Pay on delivery" : "Pay at pickup",
        o.status,
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

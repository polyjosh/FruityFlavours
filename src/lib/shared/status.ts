export type OrderStatus = "awaiting_payment" | "new" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = ["awaiting_payment", "new", "preparing", "ready", "out_for_delivery", "completed", "cancelled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** ff.css chip class for each status. */
export const STATUS_CHIP: Record<OrderStatus, string> = {
  awaiting_payment: "chip chip-await",
  new: "chip chip-new",
  preparing: "chip chip-prep",
  ready: "chip chip-ready",
  out_for_delivery: "chip chip-out",
  completed: "chip chip-done",
  cancelled: "chip chip-cancel",
};

/** Orders the shop still has to act on. */
export const NEEDS_ACTION: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery"];

/** The primary "Mark as …" step in the admin order panel. */
export function nextStatus(status: OrderStatus, fulfilment: "delivery" | "pickup"): OrderStatus | null {
  switch (status) {
    case "awaiting_payment":
      return "new";
    case "new":
      return "preparing";
    case "preparing":
      return fulfilment === "delivery" ? "out_for_delivery" : "ready";
    case "ready":
    case "out_for_delivery":
      return "completed";
    default:
      return null;
  }
}

/** Payment line shown on order cards, e.g. "M-Pesa paid · TJK8H2LQ4P". */
export function paymentText(o: {
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  fulfilment: "delivery" | "pickup";
  mpesaReceipt?: string | null;
}): { text: string; tone: "green" | "orange" | "muted" } {
  if (o.status === "cancelled" && o.paymentStatus !== "paid") return { text: "Not charged", tone: "muted" };
  if (o.paymentMethod === "mpesa") {
    if (o.paymentStatus === "paid") return { text: o.mpesaReceipt ? `M-Pesa paid · ${o.mpesaReceipt}` : "M-Pesa paid", tone: "green" };
    if (o.paymentStatus === "failed") return { text: "M-Pesa failed", tone: "orange" };
    if (o.paymentStatus === "refunded") return { text: "Refunded", tone: "muted" };
    return { text: "M-Pesa pending", tone: "orange" };
  }
  const where = o.fulfilment === "delivery" ? "on delivery" : "at pickup";
  return { text: o.status === "completed" ? `Paid ${where}` : `Pay ${where}`, tone: "muted" };
}

export const TONE_COLOR = { green: "var(--green-text)", orange: "var(--orange-text)", muted: "var(--muted)" } as const;

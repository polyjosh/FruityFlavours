export type Fulfilment = "delivery" | "pickup";
export type Availability = "on_sale" | "out_of_stock" | "coming_soon" | "hidden";

export function canOrder(availability: Availability): boolean {
  return availability === "on_sale";
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/** Pickup never has a delivery fee. All values are whole KES. */
export function computeTotals(lines: PricedLine[], fulfilment: Fulfilment, flatDeliveryFee: number): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const deliveryFee = fulfilment === "delivery" ? Math.max(0, Math.round(flatDeliveryFee)) : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function formatOrderNo(n: number): string {
  return `FF-${n}`;
}

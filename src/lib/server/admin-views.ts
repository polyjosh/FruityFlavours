import "server-only";
import type { OrderWithDetails } from "./orders";
import { shortOptionLabel } from "@/lib/shared/options";
import type { OrderStatus } from "@/lib/shared/status";

/** Serialisable order for the admin orders screen. */
export function toAdminOrderView(o: OrderWithDetails) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    fulfilment: o.fulfilment,
    deliveryAddressText: o.deliveryAddressText,
    lat: o.lat,
    lng: o.lng,
    pickupPointName: o.pickupPointName,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    mpesaReceipt: o.payments[0]?.mpesaReceipt ?? null,
    status: o.status as OrderStatus,
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      short: shortOptionLabel(i.productType, { bottlesCount: i.bottlesCount, volumeMl: i.volumeMl, label: i.optionLabel }),
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
  };
}

export type AdminOrderView = ReturnType<typeof toAdminOrderView>;

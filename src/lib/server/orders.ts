import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { priceCartLines, type PricedCartLine } from "./catalog";
import { getDeliveryFee, getPickupPoints } from "./settings";
import { sendSms } from "./sms";
import { computeTotals } from "@/lib/shared/pricing";
import { NEEDS_ACTION, type OrderStatus } from "@/lib/shared/status";
import { newOrderAdminSms, orderReceivedSms, statusSms } from "@/lib/shared/sms-templates";
import { addDays, dayKey, startOfDay } from "@/lib/shared/dates";
import type { z } from "zod";
import type { placeOrderSchema } from "@/lib/shared/checkout-schema";

type PlaceOrder = z.output<typeof placeOrderSchema>;

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number,
    public problems: PricedCartLine[] = [],
  ) {
    super(message);
  }
}

const withDetails = {
  items: { orderBy: { createdAt: "asc" } },
  payments: { where: { status: "success" }, orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof withDetails }>;

/** Creates an order from validated input. Prices, fee and totals all come from the database. */
export async function createOrder(input: PlaceOrder, userId: string | null) {
  const lines = await priceCartLines(input.lines);
  const problems = lines.filter((l) => !l.available);
  if (problems.length) throw new CheckoutError("Some products in your cart can't be ordered right now.", 409, problems);

  let pickupPoint: { id: string; name: string } | null = null;
  if (input.fulfilment === "pickup") {
    pickupPoint = (await getPickupPoints()).find((p) => p.id === input.pickupPointId) ?? null;
    if (!pickupPoint) throw new CheckoutError("That pickup point is no longer available.", 400);
  }

  const totals = computeTotals(lines, input.fulfilment, await getDeliveryFee());
  const isCod = input.paymentMethod === "cod";
  const status: OrderStatus = isCod ? "new" : "awaiting_payment";
  const delivery = input.fulfilment === "delivery";

  const prisma = await db();
  const order = await prisma.order.create({
    data: {
      userId,
      customerName: input.name,
      customerPhone: input.phone,
      customerEmail: input.email ?? null,
      fulfilment: input.fulfilment,
      deliveryAddressText: delivery ? input.address || null : null,
      lat: delivery ? (input.lat ?? null) : null,
      lng: delivery ? (input.lng ?? null) : null,
      pickupPointId: pickupPoint?.id ?? null,
      pickupPointName: pickupPoint?.name ?? null,
      ...totals,
      paymentMethod: input.paymentMethod,
      status,
      paymentStatus: isCod ? "cod" : "pending",
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          optionId: l.optionId,
          productName: l.productName,
          productType: l.productType,
          categoryName: l.categoryName,
          optionLabel: l.optionLabel,
          bottlesCount: l.bottlesCount,
          volumeMl: l.volumeMl,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      },
      statusHistory: { create: { fromStatus: null, toStatus: status, changedBy: "customer" } },
    },
  });

  // Logged-in customers: remember the delivery address for next time.
  if (userId && delivery && (input.address || input.lat !== undefined)) {
    await saveDefaultAddress(userId, { line1: input.address || "Shared location", lat: input.lat ?? null, lng: input.lng ?? null });
  }
  return order;
}

/** SMS for a new order: customer confirmation (pay on delivery / pickup) and the shop alert. */
export async function notifyNewOrder(order: Awaited<ReturnType<typeof createOrder>>) {
  if (order.paymentMethod === "cod") {
    await sendSms({ to: order.customerPhone, body: orderReceivedSms(order), template: "order_received", orderId: order.id, userId: order.userId });
  }
  const adminPhone = process.env.ADMIN_ALERT_PHONE;
  if (adminPhone) await sendSms({ to: adminPhone, body: newOrderAdminSms(order), template: "admin_new_order", orderId: order.id });
}

export async function saveDefaultAddress(userId: string, a: { line1: string; lat: number | null; lng: number | null }) {
  const prisma = await db();
  const current = await prisma.address.findFirst({ where: { userId, isDefault: true } });
  if (current) await prisma.address.update({ where: { id: current.id }, data: a });
  else await prisma.address.create({ data: { ...a, userId, isDefault: true } });
}

export async function getOrder(id: string): Promise<OrderWithDetails | null> {
  const prisma = await db();
  return prisma.order.findUnique({ where: { id }, include: withDetails });
}

export async function getCustomerOrders(userId: string) {
  const prisma = await db();
  return prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, include: withDetails });
}

// ---------- admin ----------

export type AdminOrderFilter = "action" | "today" | "delivery" | "pickup" | "all";

export async function getAdminOrders(filter: AdminOrderFilter, q: string) {
  const prisma = await db();
  const today = startOfDay(dayKey(new Date()));
  const where: Prisma.OrderWhereInput = {};
  if (filter === "action") where.status = { in: NEEDS_ACTION };
  if (filter === "today") where.createdAt = { gte: today };
  if (filter === "delivery" || filter === "pickup") where.fulfilment = filter;

  const term = q.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    const or: Prisma.OrderWhereInput[] = [{ customerName: { contains: term, mode: "insensitive" } }];
    if (digits.length >= 3) or.push({ customerPhone: { contains: digits.replace(/^0/, "") } });
    const no = Number(term.replace(/^#?ff-?/i, ""));
    if (Number.isInteger(no) && no > 0) or.push({ orderNo: no });
    where.OR = or;
  }

  const [orders, counts, latest] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: withDetails }),
    adminOrderCounts(),
    // Newest order overall, for the "New order" banner whatever the filter.
    prisma.order.findFirst({ orderBy: { createdAt: "desc" }, include: withDetails }),
  ]);
  return { orders, counts, latest };
}

export async function adminOrderCounts() {
  const prisma = await db();
  const today = startOfDay(dayKey(new Date()));
  const [action, todayCount, fresh] = await Promise.all([
    prisma.order.count({ where: { status: { in: NEEDS_ACTION } } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: "new" } }),
  ]);
  return { action, today: todayCount, new: fresh };
}

export async function updateOrderStatus(id: string, to: OrderStatus) {
  const prisma = await db();
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Order not found");
  if (order.status === to) return order;

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: to,
      statusHistory: { create: { fromStatus: order.status, toStatus: to, changedBy: "admin" } },
    },
  });
  await prisma.auditLog.create({ data: { actorId: "admin", action: "order.status", entity: "order", entityId: id, before: { status: order.status }, after: { status: to } } });

  const body = statusSms(updated, to);
  if (body) await sendSms({ to: updated.customerPhone, body, template: `status_${to}`, orderId: id, userId: updated.userId });
  return updated;
}

/** Cart lines for "Order again": only products that can still be bought, at today's prices. */
export async function reorderLines(orderId: string, userId: string) {
  const prisma = await db();
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { items: true } });
  if (!order) return null;
  const requested = order.items.filter((i) => i.optionId).map((i) => ({ optionId: i.optionId!, quantity: i.quantity }));
  const priced = await priceCartLines(requested);
  return { lines: priced.filter((l) => l.available), skipped: order.items.length - priced.filter((l) => l.available).length };
}

/** Orders counted in reports: not cancelled, and M-Pesa orders only once paid. */
export async function getReportOrders(from: Date, to: Date) {
  const prisma = await db();
  return prisma.order.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      status: { not: "cancelled" },
      OR: [{ paymentMethod: { not: "mpesa" } }, { paymentStatus: "paid" }],
    },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  });
}

export async function firstOrderDay() {
  const prisma = await db();
  const first = await prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  return first ? dayKey(first.createdAt) : addDays(dayKey(new Date()), 0);
}

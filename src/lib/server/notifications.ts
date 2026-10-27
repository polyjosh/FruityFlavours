import "server-only";
import { db } from "./db";

export type NotificationFilter = "all" | "sent" | "failed";

/** SMS log for admin. "Failed" also lists messages still queued (not sent yet), since both can be resent. */
export async function getNotificationLog(filter: NotificationFilter) {
  const prisma = await db();
  const where =
    filter === "sent" ? { status: "sent" as const } : filter === "failed" ? { status: { in: ["failed" as const, "queued" as const] } } : {};
  const [rows, all, sent, failed] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { order: { select: { customerName: true } }, user: { select: { name: true } } } }),
    prisma.notification.count(),
    prisma.notification.count({ where: { status: "sent" } }),
    prisma.notification.count({ where: { status: { in: ["failed", "queued"] } } }),
  ]);
  return { rows, counts: { all, sent, failed } };
}

/** Messages shown on the customer's account page (order updates; not codes or shop alerts). */
export async function getCustomerMessages(userId: string, phone: string) {
  const prisma = await db();
  return prisma.notification.findMany({
    where: {
      OR: [{ userId }, { recipient: phone }],
      template: { notIn: ["otp", "admin_new_order"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

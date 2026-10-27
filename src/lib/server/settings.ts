import "server-only";
import { db } from "./db";
import type { SocialKey, SocialLinks } from "@/lib/shared/social";
import type { PickupPointView } from "@/lib/shared/types";

export const DEFAULT_DELIVERY_FEE = 150;

export const EMPTY_SOCIALS: SocialLinks = { instagram: "", facebook: "", tiktok: "", x: "", youtube: "", whatsapp: "" };

export async function getDeliveryFee(): Promise<number> {
  const prisma = await db();
  const row = await prisma.setting.findUnique({ where: { key: "delivery_fee" } });
  const n = typeof row?.value === "number" ? row.value : Number(row?.value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_DELIVERY_FEE;
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const prisma = await db();
  const row = await prisma.setting.findUnique({ where: { key: "social_links" } });
  const value = (row?.value ?? {}) as Partial<Record<SocialKey, unknown>>;
  const links = { ...EMPTY_SOCIALS };
  for (const key of Object.keys(links) as SocialKey[]) {
    if (typeof value[key] === "string") links[key] = value[key] as string;
  }
  return links;
}

export async function getPickupPoints(): Promise<PickupPointView[]> {
  const prisma = await db();
  return prisma.pickupPoint.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, address: true, openingHours: true },
  });
}

export const DEFAULT_OPENING_HOURS = "Every day, 7 am to 7 pm";

export async function saveSettings(input: {
  deliveryFee: number;
  socialLinks: SocialLinks;
  removePickupPointIds: string[];
  addPickupPoints: string[];
}) {
  const prisma = await db();
  const before = { deliveryFee: await getDeliveryFee(), socialLinks: await getSocialLinks() };
  const maxSort = await prisma.pickupPoint.aggregate({ _max: { sortOrder: true } });
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: "delivery_fee" }, update: { value: input.deliveryFee }, create: { key: "delivery_fee", value: input.deliveryFee } }),
    prisma.setting.upsert({ where: { key: "social_links" }, update: { value: input.socialLinks }, create: { key: "social_links", value: input.socialLinks } }),
    // Removed points are deactivated, so old orders keep their pickup point.
    prisma.pickupPoint.updateMany({ where: { id: { in: input.removePickupPointIds } }, data: { isActive: false } }),
    ...input.addPickupPoints.map((name, i) =>
      prisma.pickupPoint.create({ data: { name, openingHours: DEFAULT_OPENING_HOURS, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 + i } }),
    ),
    prisma.auditLog.create({
      data: { actorId: "admin", action: "settings.update", entity: "settings", before, after: { deliveryFee: input.deliveryFee, socialLinks: input.socialLinks, removed: input.removePickupPointIds, added: input.addPickupPoints } },
    }),
  ]);
}

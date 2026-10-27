import type { PrismaClient } from "@prisma/client";
import { seedCategories, seedDeliveryFee, seedPickupPoints, seedProducts, seedSocialLinks } from "./seed-data";

/** Idempotent: safe to run on every start. Used by `npm run db:seed` and the local dev database. */
export async function seedDatabase(prisma: PrismaClient) {
  const categoryIds = new Map<string, string>();
  for (const [i, name] of seedCategories.entries()) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } });
    categoryIds.set(name, c.id);
  }

  // Only seed products into an empty catalog, so deleted samples stay deleted.
  if ((await prisma.product.count()) === 0) {
    for (const [i, p] of seedProducts.entries()) {
      const ingredientIds: string[] = [];
      for (const name of p.ingredients) {
        const ing = await prisma.ingredient.upsert({ where: { name }, update: {}, create: { name } });
        ingredientIds.push(ing.id);
      }
      await prisma.product.create({
        data: {
          slug: p.slug,
          name: p.name,
          type: p.type,
          categoryId: categoryIds.get(p.category)!,
          description: p.description,
          emoji: p.emoji,
          color: p.color,
          availability: p.availability,
          sortOrder: i,
          ingredients: { create: ingredientIds.map((ingredientId, j) => ({ ingredientId, sortOrder: j })) },
          options: {
            create: p.options.map((o, j) => ({
              bottlesCount: o.bottlesCount ?? null,
              volumeMl: o.volumeMl ?? null,
              label: o.label ?? null,
              price: o.price,
              sortOrder: j,
            })),
          },
        },
      });
    }
  }

  if ((await prisma.pickupPoint.count()) === 0) {
    await prisma.pickupPoint.createMany({ data: seedPickupPoints.map((p, i) => ({ ...p, sortOrder: i })) });
  }

  const defaults: Record<string, object | number> = { delivery_fee: seedDeliveryFee, social_links: seedSocialLinks };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Order numbers start at FF-1001.
  if ((await prisma.order.count()) === 0) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "public"."orders_order_no_seq" RESTART WITH 1001`);
  }
}

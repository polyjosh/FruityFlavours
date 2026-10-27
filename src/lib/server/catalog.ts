import "server-only";
import { db } from "./db";
import { deletePhoto } from "./uploads";
import { optionLabel, optionParts, type OptionInput, type ProductType } from "@/lib/shared/options";
import { slugify, type ProductInputParsed } from "@/lib/shared/product-schema";
import type { QuoteLine, ShopProduct } from "@/lib/shared/types";

const photoOrder = [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }];

function shopOption(type: ProductType, o: OptionInput & { id: string }) {
  return { id: o.id, ...optionParts(type, o), label: optionLabel(type, o), price: o.price };
}

/** Everything the shop shows: all non-hidden products with their active options. */
export async function getShopProducts(): Promise<ShopProduct[]> {
  const prisma = await db();
  const rows = await prisma.product.findMany({
    where: { availability: { not: "hidden" } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      category: true,
      options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      photos: { orderBy: photoOrder, take: 1 },
      ingredients: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    category: p.category.name,
    description: p.description,
    emoji: p.emoji,
    color: p.color,
    availability: p.availability as ShopProduct["availability"],
    ingredients: p.ingredients.map((i) => i.ingredient.name),
    photo: p.photos[0]?.url ?? null,
    options: p.options.map((o) => shopOption(p.type, o)),
  }));
}

export interface RequestedLine {
  optionId: string;
  quantity: number;
}

export interface PricedCartLine extends QuoteLine {
  productType: "drink" | "other";
  categoryName: string;
  bottlesCount: number | null;
  volumeMl: number | null;
}

/**
 * Re-prices cart lines from the database. Never trust prices from the browser.
 * Duplicate options are merged. Lines that can't be ordered come back with available = false.
 */
export async function priceCartLines(requested: RequestedLine[]): Promise<PricedCartLine[]> {
  const merged = new Map<string, number>();
  for (const l of requested) merged.set(l.optionId, (merged.get(l.optionId) ?? 0) + l.quantity);

  const prisma = await db();
  const options = await prisma.productOption.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { include: { category: true, photos: { orderBy: photoOrder, take: 1 } } } },
  });
  const byId = new Map(options.map((o) => [o.id, o]));

  return [...merged.entries()].map(([optionId, quantity]): PricedCartLine => {
    const o = byId.get(optionId);
    if (!o) {
      return {
        optionId,
        productId: null,
        productName: "This product",
        optionLabel: "",
        productType: "other",
        categoryName: "",
        bottlesCount: null,
        volumeMl: null,
        unitPrice: 0,
        quantity,
        lineTotal: 0,
        emoji: null,
        color: null,
        photo: null,
        available: false,
        reason: "not_found",
      };
    }
    const p = o.product;
    const reason = !o.isActive ? "not_found" : p.availability === "on_sale" ? null : (p.availability as PricedCartLine["reason"]);
    return {
      optionId,
      productId: p.id,
      productName: p.name,
      optionLabel: optionLabel(p.type, o),
      productType: p.type,
      categoryName: p.category.name,
      bottlesCount: o.bottlesCount,
      volumeMl: o.volumeMl,
      unitPrice: o.price,
      quantity,
      lineTotal: o.price * quantity,
      emoji: p.emoji,
      color: p.color,
      photo: p.photos[0]?.url ?? null,
      available: reason === null,
      reason,
    };
  });
}

// ---------- admin ----------

export async function getAdminProducts() {
  const prisma = await db();
  return prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      category: true,
      options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      photos: { orderBy: photoOrder, take: 1 },
    },
  });
}

export async function getCategoryNames() {
  const prisma = await db();
  return (await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })).map((c) => c.name);
}

/** The editor's view of one product. */
export async function getProductForEditor(id: string) {
  const prisma = await db();
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      ingredients: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    category: p.category.name,
    description: p.description,
    ingredients: p.ingredients.map((i) => i.ingredient.name),
    emoji: p.emoji ?? "",
    color: p.color,
    availability: p.availability,
    options: p.options.map((o) => ({ id: o.id, bottlesCount: o.bottlesCount, volumeMl: o.volumeMl, label: o.label, price: o.price })),
    photos: p.photos.map((ph) => ({ url: ph.url, path: ph.path })),
    primaryPhoto: Math.max(0, p.photos.findIndex((ph) => ph.isPrimary)),
  };
}

export type EditorProduct = NonNullable<Awaited<ReturnType<typeof getProductForEditor>>>;

async function uniqueSlug(name: string, exceptId?: string) {
  const prisma = await db();
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const hit = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
  }
}

/** Creates or updates a product with its options, ingredients and photos. Returns the id. */
export async function saveProduct(input: ProductInputParsed, id?: string) {
  const prisma = await db();
  const categoryName = input.type === "drink" ? "Drinks" : input.category;
  const category = await prisma.category.upsert({
    where: { name: categoryName },
    update: {},
    create: { name: categoryName, sortOrder: await prisma.category.count() },
  });
  const ingredientIds: string[] = [];
  for (const name of [...new Set(input.ingredients)]) {
    ingredientIds.push((await prisma.ingredient.upsert({ where: { name }, update: {}, create: { name } })).id);
  }

  const existing = id ? await prisma.product.findUnique({ where: { id }, include: { options: true, photos: true } }) : null;
  if (id && !existing) throw new Error("Product not found");

  const data = {
    name: input.name,
    slug: await uniqueSlug(input.name, id),
    type: input.type,
    categoryId: category.id,
    description: input.description,
    emoji: input.emoji,
    color: input.color ?? null,
    availability: input.availability,
  };
  const primary = Math.min(input.primaryPhoto, Math.max(0, input.photos.length - 1));
  const photos = input.photos.map((ph, i) => ({ url: ph.url, path: ph.path ?? null, isPrimary: i === primary, sortOrder: i }));
  const optionRows = input.options.map((o, i) =>
    "bottlesCount" in o
      ? { bottlesCount: o.bottlesCount, volumeMl: o.volumeMl, label: null, price: o.price, sortOrder: i }
      : { bottlesCount: null, volumeMl: null, label: o.label, price: o.price, sortOrder: i },
  );

  const productId = await prisma.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, sortOrder: await tx.product.count() } });

    // Options: update the ones kept (same id), add new ones, deactivate removed ones (old orders still point at them).
    const keep: string[] = [];
    for (const [i, o] of input.options.entries()) {
      const row = optionRows[i];
      if (o.id && existing?.options.some((x) => x.id === o.id)) {
        await tx.productOption.update({ where: { id: o.id }, data: { ...row, isActive: true } });
        keep.push(o.id);
      } else {
        keep.push((await tx.productOption.create({ data: { ...row, productId: p.id } })).id);
      }
    }
    if (existing) {
      await tx.productOption.updateMany({ where: { productId: p.id, id: { notIn: keep } }, data: { isActive: false } });
      await tx.productIngredient.deleteMany({ where: { productId: p.id } });
      await tx.productPhoto.deleteMany({ where: { productId: p.id } });
    }
    await tx.productIngredient.createMany({ data: ingredientIds.map((ingredientId, i) => ({ productId: p.id, ingredientId, sortOrder: i })) });
    await tx.productPhoto.createMany({ data: photos.map((ph) => ({ ...ph, productId: p.id })) });
    await tx.auditLog.create({
      data: { actorId: "admin", action: existing ? "product.update" : "product.create", entity: "product", entityId: p.id, after: { ...data, options: optionRows } },
    });
    return p.id;
  });

  // Remove the files of photos that were taken off the product.
  const keptPaths = new Set(photos.map((ph) => ph.path));
  for (const old of existing?.photos ?? []) if (old.path && !keptPaths.has(old.path)) await deletePhoto(old.path);
  return productId;
}

export async function setAvailability(id: string, availability: "on_sale" | "out_of_stock" | "coming_soon" | "hidden") {
  const prisma = await db();
  await prisma.product.update({ where: { id }, data: { availability } });
  await prisma.auditLog.create({ data: { actorId: "admin", action: "product.availability", entity: "product", entityId: id, after: { availability } } });
}

export async function deleteProduct(id: string) {
  const prisma = await db();
  const p = await prisma.product.findUnique({ where: { id }, include: { photos: true } });
  if (!p) return;
  // Order lines keep their snapshots; their links to the product and option are cleared.
  await prisma.$transaction([
    prisma.orderItem.updateMany({ where: { productId: id }, data: { productId: null, optionId: null } }),
    prisma.product.delete({ where: { id } }),
    prisma.auditLog.create({ data: { actorId: "admin", action: "product.delete", entity: "product", entityId: id, before: { name: p.name } } }),
  ]);
  for (const ph of p.photos) await deletePhoto(ph.path);
}

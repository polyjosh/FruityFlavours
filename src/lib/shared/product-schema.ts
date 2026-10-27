import { z } from "zod";

export const AVAILABILITIES = ["on_sale", "out_of_stock", "coming_soon", "hidden"] as const;

const money = z.number().int("Prices are whole shillings.").min(0, "Price can't be negative.").max(1_000_000);

export const drinkOptionSchema = z.object({
  id: z.string().uuid().optional(),
  bottlesCount: z.number().int().min(1, "At least 1 bottle.").max(100),
  volumeMl: z.number().int().min(1, "Enter the volume.").max(20_000),
  price: money,
});

export const otherOptionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Enter a size or description.").max(60),
  price: money,
});

export const photoSchema = z.object({
  url: z.string().min(1).max(500),
  path: z.string().max(300).nullable().optional(),
});

const base = {
  name: z.string().trim().min(1, "Enter a name.").max(80),
  description: z.string().trim().max(300).default(""),
  ingredients: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  emoji: z.string().trim().max(16).optional().transform((v) => v || null),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  availability: z.enum(AVAILABILITIES),
  photos: z.array(photoSchema).max(6, "Up to 6 photos.").default([]),
  /** Index into photos of the primary one. */
  primaryPhoto: z.number().int().min(0).default(0),
};

export const productInputSchema = z
  .discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("drink"), options: z.array(drinkOptionSchema).max(12) }),
    z.object({ ...base, type: z.literal("other"), category: z.string().trim().min(1, "Enter a category.").max(40), options: z.array(otherOptionSchema).max(12) }),
  ])
  .superRefine((v, ctx) => {
    if (v.availability === "on_sale" || v.availability === "out_of_stock") {
      if (v.options.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Add at least one option with a price." });
      v.options.forEach((o, i) => {
        if (o.price <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", i, "price"], message: "Enter a price." });
      });
    }
    if (v.type === "other" && v.category.toLowerCase() === "drinks") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Drinks are added with the Drink product type." });
    }
  });

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductInputParsed = z.output<typeof productInputSchema>;

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product"
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, parseJson } from "@/lib/server/http";
import { deleteProduct, getProductForEditor, saveProduct, setAvailability } from "@/lib/server/catalog";
import { AVAILABILITIES, productInputSchema } from "@/lib/shared/product-schema";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = adminRoute(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!(await getProductForEditor(id))) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const { data, error } = await parseJson(req, productInputSchema);
  if (error) return error;
  await saveProduct(data, id);
  return NextResponse.json({ id });
});

/** Quick availability change from the catalog list ("Mark out of stock" / "Back in stock"). */
export const PATCH = adminRoute(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { data, error } = await parseJson(req, z.object({ availability: z.enum(AVAILABILITIES) }));
  if (error) return error;
  await setAvailability(id, data.availability);
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute(async (_req: Request, { params }: Ctx) => {
  await deleteProduct((await params).id);
  return NextResponse.json({ ok: true });
});

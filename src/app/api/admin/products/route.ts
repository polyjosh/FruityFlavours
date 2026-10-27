import { NextResponse } from "next/server";
import { adminRoute, parseJson } from "@/lib/server/http";
import { saveProduct } from "@/lib/server/catalog";
import { productInputSchema } from "@/lib/shared/product-schema";

export const POST = adminRoute(async (req: Request) => {
  const { data, error } = await parseJson(req, productInputSchema);
  if (error) return error;
  const id = await saveProduct(data);
  return NextResponse.json({ id }, { status: 201 });
});

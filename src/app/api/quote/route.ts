import { NextResponse } from "next/server";
import { quoteRequestSchema } from "@/lib/shared/checkout-schema";
import { priceCartLines } from "@/lib/server/catalog";
import { getDeliveryFee } from "@/lib/server/settings";
import type { QuoteResponse } from "@/lib/shared/types";

/** Re-prices the browser's cart from the database so the cart page always shows real prices. */
export async function POST(req: Request) {
  const parsed = quoteRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });

  const [priced, deliveryFee] = await Promise.all([priceCartLines(parsed.data.lines), getDeliveryFee()]);
  const body: QuoteResponse = {
    deliveryFee,
    lines: priced.map((l) => ({
      optionId: l.optionId,
      productId: l.productId,
      productName: l.productName,
      optionLabel: l.optionLabel,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      emoji: l.emoji,
      color: l.color,
      photo: l.photo,
      available: l.available,
      reason: l.reason,
    })),
  };
  return NextResponse.json(body);
}

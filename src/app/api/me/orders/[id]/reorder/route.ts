import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { reorderLines } from "@/lib/server/orders";

/** Cart lines for "Order again", re-priced; products no longer for sale are skipped. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const { id } = await params;
  const result = await reorderLines(id, user.id);
  if (!result) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({
    skipped: result.skipped,
    lines: result.lines.map((l) => ({
      optionId: l.optionId,
      productId: l.productId,
      productName: l.productName,
      optionLabel: l.optionLabel,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      emoji: l.emoji,
      color: l.color,
      photo: l.photo,
    })),
  });
}

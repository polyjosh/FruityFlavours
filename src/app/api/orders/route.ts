import { after, NextResponse } from "next/server";
import { placeOrderSchema } from "@/lib/shared/checkout-schema";
import { CheckoutError, createOrder, notifyNewOrder } from "@/lib/server/orders";
import { currentUser } from "@/lib/server/auth";
import { fieldErrors } from "@/lib/server/http";

export async function POST(req: Request) {
  const parsed = placeOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const user = await currentUser();
    const order = await createOrder(parsed.data, user?.id ?? null);
    // M-Pesa orders get their customer SMS once the payment callback arrives (payments phase).
    after(() => notifyNewOrder(order));
    return NextResponse.json({ id: order.id, orderNo: order.orderNo, status: order.status }, { status: 201 });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return NextResponse.json({ error: e.message, problems: e.problems.map((p) => p.optionId) }, { status: e.status });
    }
    throw e;
  }
}

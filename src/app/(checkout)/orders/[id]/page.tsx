import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/server/orders";
import { formatKES } from "@/lib/shared/money";
import { formatOrderNo } from "@/lib/shared/pricing";
import { shortOptionLabel } from "@/lib/shared/options";
import { Logo } from "@/components/Logo";
import { CheckIcon, InfoIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Your order · FruityFlavours" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const n = (v: number) => v.toLocaleString("en-US");

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const order = await getOrder(id);
  if (!order) notFound();

  const delivery = order.fulfilment === "delivery";
  const paid = order.paymentStatus === "paid";
  const awaitingPayment = order.status === "awaiting_payment";
  const badge = paid ? "M-Pesa paid" : order.paymentMethod === "mpesa" ? "M-Pesa" : delivery ? "Pay on delivery" : "Pay at pickup";
  const where = delivery ? order.deliveryAddressText || "your shared location" : order.pickupPointName || "the pickup point";

  const steps = [
    { title: "We’re preparing it now", sub: "Pressed fresh, packed cold.", done: true },
    delivery
      ? { title: "Out for delivery", sub: `About 45 minutes, to ${where}.`, done: false }
      : { title: "Ready for pickup", sub: `At ${where}. We’ll SMS you when it’s ready.`, done: false },
    { title: "Enjoy!", sub: "We’ll SMS you at each step.", done: false },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <Logo width={84} />
      </div>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-[18px] px-5 py-6">
        <div className="flex flex-col gap-1.5">
          <span className="badge self-start" style={{ background: "var(--green-soft)", color: "var(--green-text)" }}>
            {badge}
          </span>
          <h1 className="h1">{awaitingPayment ? "Order saved" : "Order confirmed!"}</h1>
          <p className="muted">
            Order <strong style={{ color: "var(--text)" }}>#{formatOrderNo(order.orderNo)}</strong> · we’ve sent the details by SMS.
          </p>
        </div>

        {awaitingPayment && (
          // [PLACEHOLDER] Replaced by the M-Pesa waiting / received / failed screens in the payments phase.
          <div className="notice notice-info">
            <InfoIcon size={18} />
            <span>M-Pesa payment isn’t switched on yet. Your order is saved; we’ll be in touch to arrange payment.</span>
          </div>
        )}

        <div className="card flex flex-col gap-2 p-4" style={{ fontSize: 15 }}>
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span>
                {i.productName} · {shortOptionLabel(i.productType, { bottlesCount: i.bottlesCount, volumeMl: i.volumeMl, label: i.optionLabel })} ×{i.quantity}
              </span>
              <span className="num">{n(i.lineTotal)}</span>
            </div>
          ))}
          <div className="muted flex justify-between gap-3">
            <span>{delivery ? "Delivery" : "Pickup"}</span>
            <span className="num">{order.deliveryFee > 0 ? n(order.deliveryFee) : "Free"}</span>
          </div>
          <hr className="divider" />
          <div className="flex justify-between gap-3" style={{ fontWeight: 750 }}>
            <span>{paid ? "Total paid" : "Total to pay"}</span>
            <span className="num">{formatKES(order.total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="h3">What happens next</h2>
          <ol className="mt-2 flex flex-col">
            {steps.map((s, i) => (
              <li key={s.title} className={`flex gap-3 ${i < steps.length - 1 ? "pb-3.5" : ""}`}>
                {s.done ? (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full" style={{ background: "var(--green)", color: "var(--on-green)" }}>
                    <CheckIcon size={14} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="h-6 w-6 flex-none rounded-full" style={{ border: "2px solid var(--line-strong)" }} />
                )}
                <span>
                  <strong>{s.title}</strong>
                  <br />
                  <span className="small muted">{s.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-auto flex flex-col gap-2 pb-7">
          <Link className="btn btn-primary btn-lg btn-block" href="/account">
            Track in my account
          </Link>
          <Link className="btn btn-ghost btn-block" href="/">
            Back to shop
          </Link>
        </div>
      </main>
    </div>
  );
}

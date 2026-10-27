import type { Metadata } from "next";
import { currentUser } from "@/lib/server/auth";
import { getCustomerOrders } from "@/lib/server/orders";
import { getCustomerMessages } from "@/lib/server/notifications";
import { AuthForms } from "@/components/account/AuthForms";
import { AddressCard, LogoutButton, ReorderButton } from "@/components/account/AccountActions";
import { formatLocalPhone } from "@/lib/shared/phone";
import { formatKES } from "@/lib/shared/money";
import { formatOrderNo } from "@/lib/shared/pricing";
import { formatWhen } from "@/lib/shared/dates";
import { shortOptionLabel } from "@/lib/shared/options";
import { paymentText, STATUS_CHIP, STATUS_LABEL, TONE_COLOR, type OrderStatus } from "@/lib/shared/status";

export const metadata: Metadata = { title: "Account · FruityFlavours" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await currentUser();
  if (!user) {
    const { mode } = await searchParams;
    return <AuthForms initial={mode === "signup" || mode === "forgot" ? mode : "login"} />;
  }

  const [orders, messages] = await Promise.all([getCustomerOrders(user.id), getCustomerMessages(user.id, user.phone)]);
  const address = user.addresses[0] ?? null;
  const first = user.name.split(/\s+/)[0];
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const now = new Date();
  const phone = formatLocalPhone(user.phone);

  const orderCards = orders.map((o) => {
    const pay = paymentText({ ...o, mpesaReceipt: null });
    const fee = o.fulfilment === "delivery" && o.deliveryFee > 0 && o.paymentStatus === "paid" ? ` · incl. ${formatKES(o.deliveryFee)} delivery` : "";
    const how = o.fulfilment === "delivery" ? "Delivery" : `Pickup · ${o.pickupPointName ?? ""}`;
    return { o, pay: { ...pay, text: pay.text + fee }, how };
  });

  return (
    <div className="wrap grid items-start gap-6 pb-12 pt-6 md:grid-cols-[360px_minmax(0,1fr)] md:gap-8 md:pb-16 md:pt-10">
      <div className="flex flex-col gap-6 md:gap-5">
        {/* Profile */}
        <section className="flex items-center gap-3.5 md-card md:flex-col md:items-start md:p-6">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-[20px] font-extrabold md:h-16 md:w-16 md:text-[22px]" style={{ background: "var(--orange)", color: "var(--on-orange)" }}>
            {initials}
          </span>
          <div className="flex flex-col">
            <h1 className="h2 md-h1">Habari, {first}</h1>
            <span className="small muted md:text-base">
              {phone}
              {user.email ? ` · ${user.email}` : ""}
            </span>
          </div>
          <LogoutButton className="btn btn-secondary btn-sm hidden md:inline-flex" />
        </section>

        <AddressCard address={address ? { line1: address.line1, hasPin: address.lat !== null } : null} />

        {/* Messages (desktop: left column) */}
        <Messages messages={messages} now={now} className="hidden md:block" />
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 md-card md:gap-0 md:overflow-hidden" aria-label="Order history">
          <div className="flex items-center justify-between md:px-6 md:py-[22px]">
            <h2 className="h2">Your orders</h2>
            <span className="small muted hidden md:inline">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          </div>
          {orders.length === 0 ? (
            <p className="card muted p-4 md:rounded-none md:border-0 md:border-t md:px-6 md:py-5 md:shadow-none">No orders yet. When you order, it shows up here.</p>
          ) : (
            orderCards.map(({ o, pay, how }) => (
              <article key={o.id} className="card flex flex-col gap-2.5 p-4 md:grid md:grid-cols-[1fr_auto] md:gap-x-6 md:gap-y-3.5 md:rounded-none md:border-0 md:border-t md:px-6 md:py-5 md:shadow-none">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 md:justify-start md:gap-3">
                    <a className="strong md-h3" href={`/orders/${o.id}`}>
                      #{formatOrderNo(o.orderNo)}
                    </a>
                    <span className={STATUS_CHIP[o.status as OrderStatus]}>{STATUS_LABEL[o.status as OrderStatus]}</span>
                  </div>
                  <span className="small muted">
                    {formatWhen(o.createdAt, now)} · {how}
                  </span>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {o.items.map((i) => (
                      <li key={i.id} className="small md:text-base">
                        {i.productName} · {shortOptionLabel(i.productType, { bottlesCount: i.bottlesCount, volumeMl: i.volumeMl, label: i.optionLabel })} ×{i.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-start md:gap-1.5">
                  <div className="flex flex-col md:items-end">
                    <span className="strong num md-h3">{formatKES(o.total)}</span>
                    <span style={{ fontSize: 13, fontWeight: 650, color: TONE_COLOR[pay.tone] }}>{pay.text}</span>
                  </div>
                  <ReorderButton orderId={o.id} />
                </div>
              </article>
            ))
          )}
        </section>

        <Messages messages={messages} now={now} className="md:hidden" />
        <LogoutButton className="btn btn-secondary btn-block md:hidden" />
      </div>
    </div>
  );
}

function Messages({ messages, now, className }: { messages: { id: string; body: string; createdAt: Date }[]; now: Date; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 md-card md:gap-0 md:overflow-hidden ${className ?? ""}`} aria-label="Messages">
      <h2 className="h2 md-h3 md:px-6 md:pb-2 md:pt-5">Messages</h2>
      {messages.length === 0 ? (
        <p className="card small muted p-4 md:rounded-none md:border-0 md:border-t md:px-6 md:shadow-none">Order updates we send you by SMS show here.</p>
      ) : (
        <ul className="card flex flex-col overflow-hidden md:rounded-none md:border-0 md:shadow-none">
          {messages.map((m, i) => {
            const fresh = i === 0 && now.getTime() - m.createdAt.getTime() < 24 * 60 * 60 * 1000;
            return (
              <li key={m.id} className="flex gap-3 px-4 py-3.5 md:px-6" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="dot" style={{ marginTop: 7, background: fresh ? "var(--green)" : "var(--line-strong)" }} />
                <div className="flex flex-col gap-0.5">
                  <span className="small" style={{ fontWeight: fresh ? 650 : 400 }}>
                    {m.body}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {formatWhen(m.createdAt, now)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOrderView } from "@/lib/server/admin-views";
import { formatKES } from "@/lib/shared/money";
import { formatOrderNo } from "@/lib/shared/pricing";
import { formatLocalPhone } from "@/lib/shared/phone";
import { formatListTime, formatWhen } from "@/lib/shared/dates";
import { nextStatus, ORDER_STATUSES, paymentText, STATUS_CHIP, STATUS_LABEL, TONE_COLOR, type OrderStatus } from "@/lib/shared/status";
import { CheckIcon, ChevronDownIcon, InfoIcon } from "@/components/icons";
import { BellIcon, CloseIcon, ExternalIcon, SearchIcon } from "./icons";

type Filter = "action" | "today" | "delivery" | "pickup" | "all";
interface Data {
  orders: AdminOrderView[];
  counts: { action: number; today: number; new: number };
  latest: AdminOrderView | null;
}

const POLL_MS = 15000;
const n = (v: number) => v.toLocaleString("en-US");

function mapsUrl(o: AdminOrderView) {
  const q = o.lat !== null && o.lng !== null ? `${o.lat},${o.lng}` : (o.deliveryAddressText ?? "");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function OrdersBoard({ initial }: { initial: Data }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<Filter>("action");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial.orders[0]?.id ?? null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AdminOrderView | null>(initial.orders[0] ?? null);
  const [banner, setBanner] = useState<AdminOrderView | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenNo = useRef(initial.latest?.orderNo ?? 0);

  const load = useCallback(
    async (f: Filter, query: string) => {
      const res = await fetch(`/api/admin/orders?filter=${f}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (res.status === 401) return router.push("/admin/login");
      if (!res.ok) return;
      const next: Data = await res.json();
      setData(next);
      if (next.latest && next.latest.orderNo > seenNo.current) {
        seenNo.current = next.latest.orderNo;
        setBanner(next.latest);
        router.refresh(); // sidebar badge
      }
    },
    [router],
  );

  // Refetch when the filter or search changes (search is debounced).
  useEffect(() => {
    const t = setTimeout(() => load(filter, q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filter, q, load]);

  // Poll for new orders.
  useEffect(() => {
    const t = setInterval(() => load(filter, q), POLL_MS);
    return () => clearInterval(t);
  }, [filter, q, load]);

  const selected = data.orders.find((o) => o.id === selectedId) ?? (selectedSnapshot?.id === selectedId ? selectedSnapshot : null);

  function select(o: AdminOrderView) {
    setSelectedId(o.id);
    setSelectedSnapshot(o);
    setConfirmCancel(false);
    setError(null);
  }

  async function changeStatus(o: AdminOrderView, status: OrderStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    setConfirmCancel(false);
    if (!res.ok) return setError(json.error ?? "Couldn’t update the order.");
    setSelectedSnapshot(json.order);
    await load(filter, q);
    router.refresh();
  }

  const pills: [Filter, string][] = [
    ["action", `Needs action · ${data.counts.action}`],
    ["today", `Today · ${data.counts.today}`],
    ["delivery", "Delivery"],
    ["pickup", "Pickup"],
    ["all", "All orders"],
  ];

  return (
    <>
      {banner && (
        <div role="alert" className="flex flex-wrap items-center gap-3.5 rounded-[14px] py-3 pl-4 pr-3.5" style={{ background: "var(--orange)", color: "var(--on-orange)", boxShadow: "var(--shadow-md)" }}>
          <BellIcon size={22} />
          <span className="flex-1">
            <strong>New order #{formatOrderNo(banner.orderNo)}</strong> from {banner.customerName} · {formatKES(banner.total)} ·{" "}
            {banner.fulfilment === "pickup" ? `pickup at ${banner.pickupPointName}` : "delivery"} · {formatWhen(new Date(banner.createdAt))}
          </span>
          <button
            className="btn btn-sm"
            type="button"
            style={{ background: "var(--on-orange)", color: "var(--orange)" }}
            onClick={() => {
              select(banner);
              setBanner(null);
            }}
          >
            Open order
          </button>
          <button className="icon-btn" type="button" aria-label="Dismiss alert" onClick={() => setBanner(null)} style={{ background: "transparent", borderColor: "transparent", color: "inherit", width: 40, height: 40 }}>
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1 mr-auto">Orders</h1>
        <div className="relative w-full sm:w-[260px]">
          <label htmlFor="os" className="sr-only">
            Search orders
          </label>
          <input id="os" className="input" placeholder="Search name, phone or order no." value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 42, paddingLeft: 38, fontSize: 14 }} />
          <SearchIcon size={18} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {pills.map(([f, label]) => (
          <button key={f} className={f === filter ? "pill pill-sm on" : "pill pill-sm"} type="button" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden" aria-label="Order list">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] px-[18px] py-2.5 text-[12px] font-bold uppercase tracking-[.05em]" style={{ color: "var(--muted)" }}>
            <span>Order, customer &amp; products</span>
            <span>Total &amp; status</span>
          </div>
          {data.orders.length === 0 && <p className="muted px-[18px] py-8 text-center">{q ? "No orders match your search." : "No orders here right now."}</p>}
          {data.orders.map((o) => {
            const pay = paymentText(o);
            const sel = o.id === selectedId;
            return (
              <article
                key={o.id}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-[18px] py-3.5"
                style={{ borderTop: "1px solid var(--line)", background: sel ? "var(--green-soft)" : undefined, boxShadow: sel ? "inset 3px 0 0 var(--green)" : undefined }}
                onClick={() => select(o)}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button type="button" className="strong" onClick={() => select(o)} style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer", color: "inherit" }} aria-label={`Open order #${formatOrderNo(o.orderNo)}`}>
                      #{formatOrderNo(o.orderNo)}
                    </button>
                    <span className="small muted">{formatListTime(new Date(o.createdAt))}</span>
                    <span className="tag" style={{ height: 22, fontSize: 12 }}>
                      {o.fulfilment === "pickup" ? `Pickup · ${o.pickupPointName}` : "Delivery"}
                    </span>
                  </div>
                  <span className="small">
                    <strong>{o.customerName}</strong> ·{" "}
                    <a className="link" href={`tel:${o.customerPhone}`} style={{ fontWeight: 500 }} onClick={(e) => e.stopPropagation()}>
                      {formatLocalPhone(o.customerPhone)}
                    </a>
                  </span>
                  <span className="small muted truncate">{o.items.map((i) => `${i.productName}, ${i.short} ×${i.quantity}`).join(" · ")}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="strong num">{formatKES(o.total)}</span>
                  <span style={{ fontSize: 12, fontWeight: 650, color: TONE_COLOR[pay.tone] }}>{pay.text}</span>
                  <span className="inline-flex items-center gap-1" style={{ minHeight: 36, color: "var(--muted)" }} aria-label={`Status: ${STATUS_LABEL[o.status]}`}>
                    <span className={STATUS_CHIP[o.status]}>{STATUS_LABEL[o.status]}</span>
                    <ChevronDownIcon size={16} />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        {selected && (
          <OrderPanel
            key={selected.id}
            o={selected}
            saving={saving}
            error={error}
            confirmCancel={confirmCancel}
            onClose={() => setSelectedId(null)}
            onStatus={(s) => changeStatus(selected, s)}
            onCancel={() => (confirmCancel ? changeStatus(selected, "cancelled") : setConfirmCancel(true))}
          />
        )}
      </div>
    </>
  );
}

function OrderPanel({
  o,
  saving,
  error,
  confirmCancel,
  onClose,
  onStatus,
  onCancel,
}: {
  o: AdminOrderView;
  saving: boolean;
  error: string | null;
  confirmCancel: boolean;
  onClose: () => void;
  onStatus: (s: OrderStatus) => void;
  onCancel: () => void;
}) {
  const next = nextStatus(o.status, o.fulfilment);
  const pay = paymentText(o);
  const delivery = o.fulfilment === "delivery";
  const final = o.status === "completed" || o.status === "cancelled";

  return (
    <aside className="panel flex flex-col gap-4 p-5 xl:sticky xl:top-6" aria-label={`Order #${formatOrderNo(o.orderNo)} details`}>
      <div className="flex items-center justify-between">
        <h2 className="h2">#{formatOrderNo(o.orderNo)}</h2>
        <button className="icon-btn" type="button" aria-label="Close details" onClick={onClose} style={{ width: 40, height: 40 }}>
          <CloseIcon size={18} />
        </button>
      </div>
      <span className="small muted" style={{ marginTop: -10 }}>
        {formatWhen(new Date(o.createdAt))} · {delivery ? "Delivery" : "Pickup"}
      </span>
      <div className="field">
        <label className="label" htmlFor="st">
          Status
        </label>
        <div className="select-wrap">
          <select id="st" className="input" style={{ minHeight: 44 }} value={o.status} disabled={saving} onChange={(e) => onStatus(e.target.value as OrderStatus)}>
            {ORDER_STATUSES.filter((s) => delivery || s !== "out_for_delivery").map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={18} />
        </div>
        <span className="hint">The customer gets an SMS when you change this.</span>
      </div>
      <hr className="divider" />
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[14px]">
        <dt className="muted">Customer</dt>
        <dd className="strong">{o.customerName}</dd>
        <dt className="muted">Phone</dt>
        <dd>
          <a className="link" href={`tel:${o.customerPhone}`}>
            {formatLocalPhone(o.customerPhone)}
          </a>
        </dd>
        {o.customerEmail && (
          <>
            <dt className="muted">Email</dt>
            <dd className="break-all">{o.customerEmail}</dd>
          </>
        )}
        {delivery ? (
          <>
            <dt className="muted">Address</dt>
            <dd>
              {o.deliveryAddressText || "Location pin only"}
              <br />
              <a className="link mt-1 inline-flex items-center gap-1" href={mapsUrl(o)} target="_blank" rel="noopener noreferrer">
                Open in Maps
                <ExternalIcon size={14} />
              </a>
            </dd>
          </>
        ) : (
          <>
            <dt className="muted">Pickup at</dt>
            <dd>{o.pickupPointName}</dd>
          </>
        )}
      </dl>
      <hr className="divider" />
      <div className="flex flex-col gap-2 text-[14px]">
        {o.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3">
            <span>
              <strong>{i.productName}</strong> · {i.short} ×{i.quantity}
            </span>
            <span className="num">{n(i.lineTotal)}</span>
          </div>
        ))}
        <div className="muted flex justify-between gap-3">
          <span>{delivery ? "Delivery" : "Pickup"}</span>
          <span className="num">{o.deliveryFee > 0 ? n(o.deliveryFee) : "Free"}</span>
        </div>
        <div className="flex justify-between gap-3" style={{ fontSize: 16, fontWeight: 750 }}>
          <span>
            Total{" "}
            {delivery && o.deliveryFee > 0 && (
              <span className="small muted" style={{ fontWeight: 500 }}>
                incl. delivery
              </span>
            )}
          </span>
          <span className="num">{formatKES(o.total)}</span>
        </div>
      </div>
      <div className={`notice ${pay.tone === "green" ? "notice-green" : pay.tone === "orange" ? "notice-orange" : "notice-info"} items-center`}>
        {pay.tone === "green" ? <CheckIcon size={18} /> : <InfoIcon size={18} />}
        <span>
          {o.paymentStatus === "paid" && o.mpesaReceipt ? (
            <>
              M-Pesa paid · receipt <strong>{o.mpesaReceipt}</strong>
            </>
          ) : (
            pay.text
          )}
        </span>
      </div>
      {error && (
        <p className="notice notice-berry" role="alert">
          {error}
        </p>
      )}
      {next && (
        <button className="btn btn-primary btn-block" type="button" disabled={saving} onClick={() => onStatus(next)}>
          {saving ? "Saving…" : `Mark as ${STATUS_LABEL[next]}`}
        </button>
      )}
      {!final && (
        <button className={confirmCancel ? "btn btn-danger btn-block" : "btn btn-danger-outline btn-block"} type="button" disabled={saving} onClick={onCancel}>
          {confirmCancel ? "Tap again to confirm" : "Cancel order"}
        </button>
      )}
    </aside>
  );
}

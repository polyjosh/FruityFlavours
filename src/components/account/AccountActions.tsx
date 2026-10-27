"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CartLine } from "@/components/cart/CartProvider";
import { PinIcon } from "@/components/icons";

export function LogoutButton({ className }: { className: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

/** "Order again": puts the order's products (at today's prices) back in the cart and opens it. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { add, setQuantity, lines } = useCart();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reorder() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/me/orders/${orderId}/reorder`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(json.error ?? "Couldn’t reorder.");
    if (!json.lines?.length) return setMsg("These products aren’t available right now.");
    for (const l of json.lines as CartLine[]) {
      const existing = lines.find((x) => x.optionId === l.optionId)?.quantity ?? 0;
      add(l);
      setQuantity(l.optionId, existing + l.quantity);
    }
    router.push("/cart");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn btn-secondary btn-sm md:mt-1.5" type="button" onClick={reorder} disabled={busy}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
        </svg>
        {busy ? "Adding…" : "Order again"}
      </button>
      {msg && (
        <span className="error-text" role="status">
          {msg}
        </span>
      )}
    </div>
  );
}

/** Saved delivery address with inline edit and optional location pin. */
export function AddressCard({ address }: { address: { line1: string; hasPin: boolean } | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [line1, setLine1] = useState(address?.line1 ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("We couldn’t get your location. Please type your address instead."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line1, lat: pin?.lat ?? null, lng: pin?.lng ?? null }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.fieldErrors?.line1 ?? json.error ?? "Couldn’t save.");
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="card flex flex-col gap-2 p-4 md:p-6" aria-label="Saved delivery address">
      <div className="flex items-center justify-between">
        <h2 className="h3">Saved delivery address</h2>
        {!editing && (
          <button className="btn btn-ghost btn-sm" type="button" style={{ color: "var(--green-text)" }} onClick={() => setEditing(true)}>
            {address ? "Edit" : "Add"}
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="addr">
            Delivery address
          </label>
          <textarea id="addr" className="input" placeholder="Estate, street, house number or a landmark" value={line1} onChange={(e) => setLine1(e.target.value)} />
          {pin ? (
            <span className="small" style={{ color: "var(--green-text)" }}>
              Location shared.
            </span>
          ) : (
            <button className="btn btn-secondary btn-sm self-start" type="button" onClick={locate}>
              <PinIcon size={16} /> Share my current location <span className="opt-label">(optional)</span>
            </button>
          )}
          {error && <span className="error-text">{error}</span>}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save address"}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : address ? (
        <>
          <p className="small md:text-base">{address.line1}</p>
          {address.hasPin && (
            <span className="small muted flex items-center gap-1.5">
              <PinIcon size={16} />
              Location pin saved
            </span>
          )}
        </>
      ) : (
        <p className="small muted">No address saved yet. It’s saved when you order a delivery.</p>
      )}
    </section>
  );
}

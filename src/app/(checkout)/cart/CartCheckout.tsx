"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useCart, type CartLine } from "@/components/cart/CartProvider";
import { Logo } from "@/components/Logo";
import { ProductImage } from "@/components/ProductImage";
import { ArrowLeftIcon, BagIcon, BinIcon, CartIcon, CheckIcon, ChevronDownIcon, MinusIcon, PinIcon, PlusIcon, TruckIcon } from "@/components/icons";
import { formatKES } from "@/lib/shared/money";
import { computeTotals, type Fulfilment } from "@/lib/shared/pricing";
import type { PickupPointView, QuoteLine, QuoteResponse } from "@/lib/shared/types";

export interface CheckoutPrefill {
  name: string;
  phone: string;
  email: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  deliveryFee: number;
  pickupPoints: PickupPointView[];
  prefill: CheckoutPrefill | null;
}

type PaymentMethod = "mpesa" | "cod";
type FieldErrors = Partial<Record<"name" | "phone" | "email" | "address" | "pickupPointId" | "form", string>>;

const REASON_TEXT: Record<NonNullable<QuoteLine["reason"]>, string> = {
  out_of_stock: "Out of stock",
  coming_soon: "Coming soon",
  hidden: "No longer available",
  not_found: "No longer available",
};

export function CartCheckout({ deliveryFee: initialFee, pickupPoints, prefill }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoteTick, setQuoteTick] = useState(0);

  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [address, setAddress] = useState(prefill?.address ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    prefill?.lat != null && prefill.lng != null ? { lat: prefill.lat, lng: prefill.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pickupPointId, setPickupPointId] = useState(pickupPoints[0]?.id ?? "");
  const [payment, setPayment] = useState<PaymentMethod>("mpesa");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [placing, setPlacing] = useState(false);

  // Re-price from the server whenever the cart contents change.
  const cartKey = cart.lines.map((l) => `${l.optionId}:${l.quantity}`).join(",");
  useEffect(() => {
    if (!cart.ready || cart.lines.length === 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: cart.lines.map((l) => ({ optionId: l.optionId, quantity: l.quantity })) }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        setQuote(await res.json());
        setQuoteFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteFailed(true);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, cart.ready, quoteTick]);

  const quoted = useMemo(() => new Map(quote?.lines.map((l) => [l.optionId, l]) ?? []), [quote]);

  // Keep the stored cart's display prices in line with the server.
  useEffect(() => {
    if (!quote) return;
    let changed = false;
    const next = cart.lines.map((l): CartLine => {
      const q = quoted.get(l.optionId);
      if (q?.available && (q.unitPrice !== l.unitPrice || q.optionLabel !== l.optionLabel || q.productName !== l.productName)) {
        changed = true;
        return { ...l, unitPrice: q.unitPrice, optionLabel: q.optionLabel, productName: q.productName, photo: q.photo };
      }
      return l;
    });
    if (changed) cart.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  const fee = quote?.deliveryFee ?? initialFee;
  const unavailable = cart.lines.filter((l) => quoted.get(l.optionId)?.available === false);
  const availableLines = cart.lines.filter((l) => quoted.get(l.optionId)?.available !== false);
  const totals = computeTotals(availableLines, fulfilment, fee);
  const itemCount = availableLines.reduce((n, l) => n + l.quantity, 0);
  const delivery = fulfilment === "delivery";
  const codTitle = delivery ? "Pay on delivery" : "Pay at pickup";
  const feeText = fee > 0 ? formatKES(fee) : "Free";
  const point = pickupPoints.find((p) => p.id === pickupPointId);
  const openText = point?.openingHours ? `Open ${point.openingHours.charAt(0).toLowerCase()}${point.openingHours.slice(1)}.` : "";

  function shareLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Your browser can’t share location. Please type your address instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setErrors((e) => ({ ...e, address: undefined }));
      },
      () => {
        setLocationError("We couldn’t get your location. Please type your address instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!phone.trim()) next.phone = "Please enter your M-Pesa phone number.";
    if (delivery && !address.trim() && !pin) next.address = "Tell us where to deliver, or share your location.";
    if (!delivery && !pickupPointId) next.pickupPointId = "Choose a pickup point.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          fulfilment,
          address: delivery ? address || undefined : undefined,
          lat: delivery ? pin?.lat : undefined,
          lng: delivery ? pin?.lng : undefined,
          pickupPointId: delivery ? undefined : pickupPointId,
          paymentMethod: payment,
          lines: availableLines.map((l) => ({ optionId: l.optionId, quantity: l.quantity })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ ...(json.fieldErrors ?? {}), form: json.error ?? "Something went wrong. Please try again." });
        if (res.status === 409) setQuoteTick((n) => n + 1); // re-check which products became unavailable
        setPlacing(false);
        return;
      }
      cart.clear();
      router.push(`/orders/${json.id}`);
    } catch {
      setErrors({ form: "We couldn’t reach the shop. Check your connection and try again." });
      setPlacing(false);
    }
  }

  const empty = cart.ready && cart.lines.length === 0;

  return (
    <>
      {/* mobile header */}
      <header className="flex items-center justify-between gap-2 px-4 py-3 md:hidden" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <Link className="btn btn-secondary btn-sm" href="/">
          <ArrowLeftIcon size={18} />
          Back to shop
        </Link>
        <Logo width={84} />
      </header>
      {/* desktop header */}
      <header className="hidden md:block" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="wrap flex h-20 items-center gap-6">
          <Logo width={120} />
          <nav className="flex gap-1" aria-label="Main">
            <Link className="hnav" href="/">
              Shop
            </Link>
            <Link className="hnav" href="/account">
              Account
            </Link>
          </nav>
        </div>
      </header>

      <main className="wrap flex flex-col gap-5 pb-8 pt-5 md:pb-16 md:pt-7">
        <Link className="btn btn-secondary btn-sm hidden self-start md:inline-flex" href="/">
          <ArrowLeftIcon size={18} />
          Back to shop
        </Link>
        <h1 className="h1 hidden md:block" style={{ fontSize: 36 }}>
          Cart &amp; checkout
        </h1>

        {!cart.ready ? (
          <p className="muted py-16 text-center" role="status">
            Loading your cart…
          </p>
        ) : empty ? (
          <section className="flex flex-col items-center gap-3.5 px-2 pb-24 pt-16 text-center md-card md:p-16">
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full md:hidden" style={{ background: "var(--green-soft)", color: "var(--green-text)" }}>
              <CartIcon size={40} strokeWidth={1.8} />
            </span>
            <h2 className="h1">Your cart is empty</h2>
            <p className="muted" style={{ maxWidth: 320 }}>
              <span className="md:hidden">Nothing here yet. </span>Pick a juice, a smoothie or a slice of cake and it will show up here.
            </p>
            <Link className="btn btn-primary btn-lg mt-2" href="/">
              Browse the shop
            </Link>
          </section>
        ) : (
          <form onSubmit={placeOrder} noValidate className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_400px] md:gap-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-baseline justify-between md:hidden">
                <h1 className="h1">Your cart</h1>
                <span className="small muted">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
              </div>

              {/* Items */}
              <section className="md-card md:flex md:flex-col md:gap-3.5 md:p-6" aria-label="Cart items">
                <h2 className="h2 hidden md:block">Items ({itemCount})</h2>
                <ul className="flex flex-col gap-2.5 md:gap-0">
                  {cart.lines.map((l) => {
                    const q = quoted.get(l.optionId);
                    const off = q?.available === false;
                    const unit = q?.available ? q.unitPrice : l.unitPrice;
                    return (
                      <li key={l.optionId} className="card flex gap-3 p-3.5 md:grid md:grid-cols-[72px_1fr_auto_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:border-t md:px-0 md:py-3.5 md:shadow-none">
                        <ProductImage name={l.productName} photo={l.photo} emoji={l.emoji} color={l.color} size={64} greyscale={off} className="md:hidden" />
                        <ProductImage name={l.productName} photo={l.photo} emoji={l.emoji} color={l.color} size={72} greyscale={off} className="hidden md:flex" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2 md:contents">
                          <div className="flex justify-between gap-2 md:flex-col md:justify-start md:gap-0.5">
                            <span className="strong md:text-[17px]">{l.productName}</span>
                            {!off && <span className="strong num md:hidden">{formatKES(unit * l.quantity)}</span>}
                            <span className="small muted hidden md:block">{l.optionLabel}</span>
                            <span className="small muted num hidden md:block">{formatKES(unit)} each</span>
                          </div>
                          <span className="small muted md:hidden">
                            {l.optionLabel} · {formatKES(unit)} each
                          </span>
                          {off ? (
                            <div className="flex items-center gap-3 md:col-span-2 md:justify-end">
                              <span className="badge badge-oos">{REASON_TEXT[q!.reason ?? "not_found"]}</span>
                              <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => cart.remove(l.optionId)}>
                                <BinIcon size={16} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="stepper self-start md:self-center">
                                {l.quantity === 1 ? (
                                  <button type="button" aria-label={`Remove ${l.productName} from cart`} onClick={() => cart.setQuantity(l.optionId, 0)}>
                                    <BinIcon size={18} />
                                  </button>
                                ) : (
                                  <button type="button" aria-label={`Remove one ${l.productName}`} onClick={() => cart.setQuantity(l.optionId, l.quantity - 1)}>
                                    <MinusIcon size={18} />
                                  </button>
                                )}
                                <span className="qty" aria-live="polite">
                                  {l.quantity}
                                </span>
                                <button type="button" aria-label={`Add one ${l.productName}`} disabled={l.quantity >= 50} onClick={() => cart.setQuantity(l.optionId, l.quantity + 1)}>
                                  <PlusIcon size={18} />
                                </button>
                              </div>
                              <span className="strong num hidden min-w-[100px] text-right md:block">{formatKES(unit * l.quantity)}</span>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
              {quoteFailed && (
                <p className="notice notice-berry" role="alert">
                  We couldn’t check the latest prices. Your total will be confirmed when you place the order.
                </p>
              )}

              {/* Summary (mobile position) */}
              <Summary className="md:hidden" itemCount={itemCount} totals={totals} delivery={delivery} />

              {/* Details */}
              <Block label="Your details">
                <h2 className="h2">Your details</h2>
                <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
                  <Field id="name" label="Your name" error={errors.name}>
                    <input id="name" className={errors.name ? "input is-error" : "input"} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
                  </Field>
                  <Field id="phone" label="M-Pesa phone number" error={errors.phone}>
                    <div className="input-group">
                      <span className="prefix">+254</span>
                      <input id="phone" className={errors.phone ? "input is-error" : "input"} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} />
                    </div>
                  </Field>
                  <Field
                    id="email"
                    className="md:col-span-2"
                    label={
                      <>
                        Email <span className="opt-label">(optional, for a receipt)</span>
                      </>
                    }
                    error={errors.email}
                  >
                    <input id="email" className={errors.email ? "input is-error" : "input"} type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
                  </Field>
                </div>
              </Block>

              {/* Delivery or pickup */}
              <Block label="Delivery or pickup">
                <h2 className="h2">How do you want it?</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Choice on={delivery} onClick={() => setFulfilment("delivery")} title="Deliver to me" sub={`Around Ongata Rongai · ${feeText}`} />
                  <Choice on={!delivery} onClick={() => setFulfilment("pickup")} title="I’ll pick it up" sub="Free · ready in about 30 minutes" />
                </div>

                {delivery ? (
                  <div className="flex flex-col gap-3 md:gap-3.5">
                    {fee > 0 ? (
                      <div className="notice notice-orange" role="note">
                        <TruckIcon size={18} />
                        <span>
                          Delivery charges apply: <strong>{formatKES(fee)}</strong> will be added to your total.
                        </span>
                      </div>
                    ) : null}
                    <Field id="address" label="Delivery address" error={errors.address}>
                      <textarea id="address" className={errors.address ? "input is-error" : "input"} autoComplete="street-address" placeholder="Estate, street, house number or a landmark" value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-err" : undefined} />
                    </Field>
                    {pin ? (
                      <div className="notice notice-green items-center" role="status">
                        <CheckIcon size={18} />
                        <span className="flex-1">
                          <strong>Location shared.</strong> Our rider will see your pin.
                        </span>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPin(null)} style={{ color: "inherit", textDecoration: "underline", padding: "0 6px" }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary btn-block md:w-auto md:self-start" type="button" onClick={shareLocation} disabled={locating}>
                        <PinIcon size={18} />
                        {locating ? (
                          "Getting your location…"
                        ) : (
                          <>
                            Share my current location <span className="opt-label">(optional)</span>
                          </>
                        )}
                      </button>
                    )}
                    {locationError && (
                      <p className="error-text" role="alert">
                        {locationError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 md:gap-3.5">
                    <div className="notice notice-green" role="note">
                      <BagIcon size={18} />
                      <span>Pickup has no delivery charge.</span>
                    </div>
                    <Field id="pickupPointId" label="Pickup point" error={errors.pickupPointId} className="md:max-w-[420px]" hint={`${openText} We’ll SMS you when it’s ready.`.trim()}>
                      <div className="select-wrap">
                        <select id="pickupPointId" className="input" value={pickupPointId} onChange={(e) => setPickupPointId(e.target.value)} aria-invalid={!!errors.pickupPointId}>
                          {pickupPoints.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon size={18} />
                      </div>
                    </Field>
                  </div>
                )}
              </Block>

              {/* Payment */}
              <Block label="Payment">
                <h2 className="h2">Payment</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Choice on={payment === "mpesa"} onClick={() => setPayment("mpesa")} title="M-Pesa" sub="We’ll send a prompt to your phone. Enter your PIN to pay." />
                  <Choice on={payment === "cod"} onClick={() => setPayment("cod")} title={codTitle} sub="M-Pesa or cash when you get your order." />
                </div>
              </Block>

              {/* Place order (mobile position) */}
              <div className="flex flex-col gap-2.5 md:hidden">
                <PlaceOrder errors={errors} unavailable={unavailable.length} placing={placing} total={totals.total} disabled={availableLines.length === 0} />
              </div>
            </div>

            {/* Summary + place order (desktop) */}
            <aside className="card hidden flex-col gap-3.5 p-6 md:sticky md:top-6 md:flex" aria-label="Order summary">
              <SummaryRows itemCount={itemCount} totals={totals} delivery={delivery} desktop />
              <PlaceOrder errors={errors} unavailable={unavailable.length} placing={placing} total={totals.total} disabled={availableLines.length === 0} />
            </aside>
          </form>
        )}
      </main>
    </>
  );
}

type Totals = ReturnType<typeof computeTotals>;

function SummaryRows({ itemCount, totals, delivery, desktop }: { itemCount: number; totals: Totals; delivery: boolean; desktop?: boolean }) {
  return (
    <>
      <h2 className={desktop ? "h2" : "h3"}>Order summary</h2>
      <div className="flex justify-between gap-3" style={{ fontSize: 15 }}>
        <span className="muted">{desktop ? `Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})` : "Subtotal"}</span>
        <span className="num">{formatKES(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between gap-3" style={{ fontSize: 15 }}>
        <span className="muted">{delivery ? "Delivery" : "Pickup"}</span>
        <span className="num">{totals.deliveryFee > 0 ? formatKES(totals.deliveryFee) : "Free"}</span>
      </div>
      <hr className="divider" />
      <div className="flex justify-between gap-3" style={{ fontSize: desktop ? 20 : 18, fontWeight: 750 }}>
        <span>Total</span>
        <span className="num">{formatKES(totals.total)}</span>
      </div>
    </>
  );
}

function Summary({ className, ...rest }: { className?: string; itemCount: number; totals: Totals; delivery: boolean }) {
  return (
    <section className={`card flex flex-col gap-2.5 p-4 ${className ?? ""}`} aria-label="Order summary">
      <SummaryRows {...rest} />
    </section>
  );
}

function PlaceOrder({ errors, unavailable, placing, total, disabled }: { errors: FieldErrors; unavailable: number; placing: boolean; total: number; disabled: boolean }) {
  return (
    <>
      {unavailable > 0 && <p className="notice notice-berry">Remove the products that aren’t available to continue.</p>}
      {errors.form && (
        <p className="notice notice-berry" role="alert">
          {errors.form}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg btn-block mt-1.5" disabled={placing || unavailable > 0 || disabled}>
        {placing ? "Placing order…" : `Place order · ${formatKES(total)}`}
      </button>
      <p className="small muted text-center">You’ll get an SMS as soon as your order is confirmed.</p>
    </>
  );
}

/** Plain section on mobile, card block on desktop (as in the two cart boards). */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 md-card md:p-6" aria-label={label}>
      {children}
    </section>
  );
}

function Field({ id, label, error, hint, className, children }: { id: string; label: ReactNode; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`field ${className ?? ""}`}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span id={`${id}-err`} className="error-text">
          {error}
        </span>
      )}
    </div>
  );
}

function Choice({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" className={on ? "choice on" : "choice"} aria-pressed={on} onClick={onClick}>
      <span className="radio" />
      <span className="flex flex-col gap-0.5">
        <span className="strong">{title}</span>
        <span className="small muted">{sub}</span>
      </span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckIcon, PinIcon, PlusIcon, SOCIAL_ICONS, TruckIcon } from "@/components/icons";
import { formatKES } from "@/lib/shared/money";
import type { SocialKey, SocialLinks } from "@/lib/shared/social";

interface Props {
  deliveryFee: number;
  pickupPoints: { id: string; name: string }[];
  socialLinks: SocialLinks;
}

const SOCIAL_FIELDS: { key: Exclude<SocialKey, "whatsapp">; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/yourhandle" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/yourpage" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@yourhandle" },
  { key: "x", label: "X", placeholder: "x.com/yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@yourchannel" },
];

export function SettingsForm({ deliveryFee, pickupPoints, socialLinks }: Props) {
  const router = useRouter();
  const [fee, setFee] = useState(String(deliveryFee));
  const [points, setPoints] = useState(pickupPoints.map((p) => ({ ...p, isNew: false })));
  const [removed, setRemoved] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState("");
  const [socials, setSocials] = useState<SocialLinks>({
    ...socialLinks,
    // Shown after the +254 prefix.
    whatsapp: socialLinks.whatsapp.replace(/^\+254/, ""),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const feeNum = Math.round(Number(fee.replace(/[,\s]/g, "")));

  function addPoint() {
    const name = newPoint.trim();
    if (!name) return;
    setPoints((p) => [...p, { id: `new-${Date.now()}`, name, isNew: true }]);
    setNewPoint("");
  }

  function removePoint(id: string) {
    if (confirm !== id) return setConfirm(id);
    const p = points.find((x) => x.id === id);
    if (p && !p.isNew) setRemoved((r) => [...r, id]);
    setPoints((ps) => ps.filter((x) => x.id !== id));
    setConfirm(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryFee: Number.isFinite(feeNum) ? feeNum : -1,
        socialLinks: socials,
        removePickupPointIds: removed,
        addPickupPoints: points.filter((p) => p.isNew).map((p) => p.name),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setErrors({ ...(json.fieldErrors ?? {}), form: json.error ?? "Couldn’t save." });
    setRemoved([]);
    setToast(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(false), 2600);
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="relative flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="h1 mr-auto">Settings</h1>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <div aria-live="polite">
        {toast && (
          <div className="toast fixed right-7 top-20 z-50 w-[300px]" role="status">
            <span className="t-icon">
              <CheckIcon size={16} strokeWidth={3} />
            </span>
            Settings saved
          </div>
        )}
      </div>
      {errors.form && (
        <p className="notice notice-berry" role="alert">
          {errors.form}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Delivery fee">
            <div>
              <h2 className="h3">Delivery fee</h2>
              <p className="small muted">One flat fee added to every delivery order. Pickup is always free.</p>
            </div>
            <div className="field" style={{ maxWidth: 240 }}>
              <label className="label" htmlFor="fee">
                Flat delivery fee
              </label>
              <div className="input-group">
                <span className="prefix">KES</span>
                <input id="fee" className={errors.deliveryFee ? "input num is-error" : "input num"} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              {errors.deliveryFee ? <span className="error-text">{errors.deliveryFee}</span> : <span className="hint">0 means free delivery.</span>}
            </div>
            <div className="notice notice-orange">
              <TruckIcon size={18} />
              <span>
                {feeNum > 0
                  ? `Customers see: “Delivery charges apply: ${formatKES(feeNum)} will be added to your total.”`
                  : "Customers see delivery as free."}
              </span>
            </div>
          </section>

          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Pickup points">
            <div>
              <h2 className="h3">Pickup points</h2>
              <p className="small muted">Shown in the checkout when a customer picks “I’ll pick it up”.</p>
            </div>
            <ul className="flex flex-col gap-2">
              {points.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl py-2.5 pl-3.5 pr-2.5" style={{ background: "var(--surface-2)" }}>
                  <PinIcon size={18} />
                  <span className="flex-1" style={{ fontWeight: 600 }}>
                    {p.name}
                    {p.isNew && <span className="small muted"> · not saved yet</span>}
                  </span>
                  {confirm === p.id ? (
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => removePoint(p.id)}>
                      Tap again to confirm
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" type="button" style={{ color: "var(--berry-text)" }} aria-label={`Remove ${p.name}`} onClick={() => removePoint(p.id)} disabled={points.length === 1}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {points.length === 1 && <p className="hint">Keep at least one pickup point.</p>}
            <div className="flex items-end gap-2">
              <div className="field flex-1">
                <label className="label" htmlFor="np">
                  Add a pickup point
                </label>
                <input
                  id="np"
                  className="input"
                  placeholder="e.g. Tumaini stage stall"
                  value={newPoint}
                  onChange={(e) => setNewPoint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPoint();
                    }
                  }}
                />
              </div>
              <button className="btn btn-secondary" type="button" onClick={addPoint}>
                <PlusIcon size={18} />
                Add
              </button>
            </div>
          </section>
        </div>

        <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Social media links">
          <div>
            <h2 className="h3">Social media links</h2>
            <p className="small muted">Only links you fill in show in the shop footer.</p>
          </div>
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
            const Icon = SOCIAL_ICONS[key];
            const err = errors[`socialLinks.${key}`];
            return (
              <div key={key} className="grid grid-cols-[40px_1fr] items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: "var(--surface-2)" }}>
                  <Icon />
                </span>
                <div className="field">
                  <label className="label" htmlFor={key}>
                    {label}
                  </label>
                  <input id={key} className={err ? "input is-error" : "input"} placeholder={placeholder} value={socials[key]} onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))} aria-invalid={!!err} />
                  {err ? <span className="error-text">{err}</span> : !socials[key] && <span className="hint">Empty: hidden in the footer.</span>}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[40px_1fr] items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: "var(--surface-2)" }}>
              <SOCIAL_ICONS.whatsapp />
            </span>
            <div className="field">
              <label className="label" htmlFor="wa">
                WhatsApp number
              </label>
              <div className="input-group">
                <span className="prefix">+254</span>
                <input id="wa" className={errors["socialLinks.whatsapp"] ? "input is-error" : "input"} inputMode="tel" placeholder="712 000 111" value={socials.whatsapp} onChange={(e) => setSocials((s) => ({ ...s, whatsapp: e.target.value }))} />
              </div>
              {errors["socialLinks.whatsapp"] && <span className="error-text">{errors["socialLinks.whatsapp"]}</span>}
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}

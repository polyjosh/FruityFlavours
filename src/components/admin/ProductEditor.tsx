"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChevronDownIcon, PlusIcon } from "@/components/icons";
import { CloseIcon, StarIcon, UploadIcon } from "./icons";
import { optionLabel, perBottleLabel } from "@/lib/shared/options";
import { formatKES } from "@/lib/shared/money";
import type { ProductInput } from "@/lib/shared/product-schema";

type Availability = "on_sale" | "out_of_stock" | "coming_soon" | "hidden";
type Unit = "ml" | "L";

export interface EditorInitial {
  id: string;
  type: "drink" | "other";
  name: string;
  category: string;
  description: string;
  ingredients: string[];
  emoji: string;
  color: string | null;
  availability: Availability;
  options: { id: string; bottlesCount: number | null; volumeMl: number | null; label: string | null; price: number }[];
  photos: { url: string; path: string | null }[];
  primaryPhoto: number;
}

interface DrinkRow {
  key: number;
  id?: string;
  bottles: string;
  vol: string;
  unit: Unit;
  price: string;
}
interface OtherRow {
  key: number;
  id?: string;
  label: string;
  price: string;
}

const SWATCHES: [string, string][] = [
  ["Mango", "#ffd59a"],
  ["Leaf", "#d5e8c0"],
  ["Berry", "#f3c6d0"],
  ["Plum", "#e6d3ea"],
  ["Caramel", "#f5d3b0"],
  ["Pineapple", "#f6eaa6"],
];

const AVAILS: [Availability, string, string][] = [
  ["on_sale", "On sale", "Shown and can be bought"],
  ["out_of_stock", "Out of stock", "Shown, greyed out"],
  ["coming_soon", "Coming soon", "Shown with “Price soon”"],
  ["hidden", "Hidden", "Not shown in the shop"],
];

const MAX_PHOTOS = 6;
const num = (v: string) => Number(v.replace(/[,\s]/g, ""));
const priceText = (p: number) => (p ? p.toLocaleString("en-US") : "");

function toRow(ml: number | null): { vol: string; unit: Unit } {
  if (ml && ml >= 1000 && ml % 100 === 0) return { vol: String(ml / 1000), unit: "L" };
  return { vol: ml ? String(ml) : "", unit: "ml" };
}

export function ProductEditor({ product, categories }: { product: EditorInitial | null; categories: string[] }) {
  const router = useRouter();
  const nextKey = useRef(100);
  const key = () => nextKey.current++;
  const fileInput = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<"drink" | "other">(product?.type ?? "drink");
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.type === "other" ? product.category : "");
  const [ingredients, setIngredients] = useState<string[]>(product?.ingredients ?? []);
  const [ingInput, setIngInput] = useState("");
  const [description, setDescription] = useState(product?.description ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "");
  const [color, setColor] = useState(product?.color ?? "#ffd59a");
  const [availability, setAvailability] = useState<Availability>(product?.availability ?? "on_sale");
  const [drinkRows, setDrinkRows] = useState<DrinkRow[]>(
    product?.type === "drink" && product.options.length
      ? product.options.map((o, i) => ({ key: i, id: o.id, bottles: String(o.bottlesCount ?? 1), ...toRow(o.volumeMl), price: priceText(o.price) }))
      : [{ key: 0, bottles: "1", vol: "500", unit: "ml", price: "" }],
  );
  const [otherRows, setOtherRows] = useState<OtherRow[]>(
    product?.type === "other" && product.options.length
      ? product.options.map((o, i) => ({ key: i, id: o.id, label: o.label ?? "", price: priceText(o.price) }))
      : [{ key: 0, label: "", price: "" }],
  );
  const [photos, setPhotos] = useState(product?.photos ?? []);
  const [primary, setPrimary] = useState(product?.primaryPhoto ?? 0);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const drink = type === "drink";
  const title = product ? `Edit ${product.name}` : "Add product";

  function addIngredient() {
    const v = ingInput.trim().replace(/,$/, "");
    if (v && !ingredients.some((i) => i.toLowerCase() === v.toLowerCase())) setIngredients([...ingredients, v]);
    setIngInput("");
  }
  function onIngKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addIngredient();
    } else if (e.key === "Backspace" && !ingInput && ingredients.length) {
      setIngredients(ingredients.slice(0, -1));
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    setUploading(true);
    setErrors((e) => ({ ...e, photos: "" }));
    const added: { url: string; path: string | null }[] = [];
    for (const f of list) {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        setErrors((e) => ({ ...e, photos: "Photos must be JPG or PNG." }));
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        setErrors((e) => ({ ...e, photos: "Photos must be 5 MB or smaller." }));
        continue;
      }
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (res.ok) added.push({ url: json.url, path: json.path });
      else setErrors((e) => ({ ...e, photos: json.error ?? "Upload failed." }));
    }
    if (files.length > room) setErrors((e) => ({ ...e, photos: `Up to ${MAX_PHOTOS} photos.` }));
    setPhotos((p) => [...p, ...added]);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setPrimary((pr) => (i === pr ? 0 : i < pr ? pr - 1 : pr));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    const base = {
      name,
      description,
      ingredients,
      emoji: emoji || undefined,
      color,
      availability,
      photos,
      primaryPhoto: primary,
    };
    const payload: ProductInput = drink
      ? {
          ...base,
          type: "drink",
          options: drinkRows.map((r) => ({
            id: r.id,
            bottlesCount: Math.round(num(r.bottles)) || 0,
            volumeMl: Math.round(r.unit === "L" ? num(r.vol) * 1000 : num(r.vol)) || 0,
            price: Math.round(num(r.price)) || 0,
          })),
        }
      : { ...base, type: "other", category, options: otherRows.map((r) => ({ id: r.id, label: r.label, price: Math.round(num(r.price)) || 0 })) };

    const res = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setErrors({ ...(json.fieldErrors ?? {}), form: json.error ?? "Couldn’t save. Please try again." });
      return;
    }
    router.push("/admin/catalog");
    router.refresh();
  }

  const err = (k: string) => errors[k];
  const actions = (
    <>
      <Link className="btn btn-secondary" href="/admin/catalog">
        Cancel
      </Link>
      <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
        {saving ? "Saving…" : "Save product"}
      </button>
    </>
  );

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto flex flex-col gap-1">
          <nav aria-label="Breadcrumb" className="small muted">
            <Link className="link" href="/admin/catalog" style={{ fontWeight: 500 }}>
              Catalog
            </Link>{" "}
            / {product?.name ?? "New product"}
          </nav>
          <h1 className="h1">{title}</h1>
        </div>
        {actions}
      </div>

      {errors.form && (
        <p className="notice notice-berry" role="alert">
          {errors.form}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          {/* Basics */}
          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Basics">
            <h2 className="h3">Basics</h2>
            <div className="field">
              <span className="label" id="pt">
                Product type
              </span>
              <div className="seg" role="group" aria-labelledby="pt" style={{ maxWidth: 420 }}>
                <button className={drink ? "on" : ""} type="button" aria-pressed={drink} onClick={() => setType("drink")}>
                  Drink
                </button>
                <button className={drink ? "" : "on"} type="button" aria-pressed={!drink} onClick={() => setType("other")}>
                  Other product (e.g. cake)
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label className="label" htmlFor="pn">
                  Name
                </label>
                <input id="pn" className={err("name") ? "input is-error" : "input"} value={name} onChange={(e) => setName(e.target.value)} />
                {err("name") && <span className="error-text">{err("name")}</span>}
              </div>
              {drink ? (
                <div className="field">
                  <span className="label">Category</span>
                  <span className="input flex items-center" style={{ background: "var(--surface-2)", color: "var(--muted)", borderColor: "var(--line)" }}>
                    Drinks (set by product type)
                  </span>
                </div>
              ) : (
                <div className="field">
                  <label className="label" htmlFor="pc">
                    Category
                  </label>
                  <input id="pc" className={err("category") ? "input is-error" : "input"} value={category} onChange={(e) => setCategory(e.target.value)} list="cats" placeholder="e.g. Cakes" />
                  <datalist id="cats">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {err("category") ? <span className="error-text">{err("category")}</span> : <span className="hint">Shoppers can filter by this. Type a new one to add it.</span>}
                </div>
              )}
            </div>
            <div className="field">
              <label className="label" htmlFor="pi">
                Ingredients
              </label>
              <div className="input flex flex-wrap items-center gap-1.5" style={{ padding: "8px 10px", minHeight: 52 }}>
                {ingredients.map((i) => (
                  <span key={i} className="tag" style={{ background: "var(--green-soft)", color: "var(--green-text)", gap: 4, paddingRight: 4 }}>
                    {i}
                    <button type="button" aria-label={`Remove ${i}`} onClick={() => setIngredients(ingredients.filter((x) => x !== i))} style={{ width: 22, height: 22, border: 0, background: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <CloseIcon size={12} strokeWidth={3} />
                    </button>
                  </span>
                ))}
                <input id="pi" placeholder="Add an ingredient, press Enter" value={ingInput} onChange={(e) => setIngInput(e.target.value)} onKeyDown={onIngKey} onBlur={addIngredient} style={{ flex: 1, minWidth: 180, border: 0, background: "none", color: "var(--text)", font: "inherit", fontSize: 15, outline: "none", minHeight: 32 }} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="pd">
                Description
              </label>
              <textarea id="pd" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
              <span className="hint">One or two short sentences. Shown on the product card.</span>
            </div>
            <div className="grid items-start gap-4 sm:grid-cols-[160px_1fr]">
              <div className="field">
                <label className="label" htmlFor="pe">
                  Emoji
                </label>
                <input id="pe" className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ fontSize: 22, textAlign: "center" }} maxLength={4} />
              </div>
              <div className="field">
                <span className="label" id="pcol">
                  Fallback colour
                </span>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="pcol">
                  {SWATCHES.map(([label, hex]) => (
                    <button key={hex} className={hex === color ? "swatch on" : "swatch"} type="button" aria-label={label} aria-pressed={hex === color} onClick={() => setColor(hex)} style={{ background: hex }} />
                  ))}
                  <div className="photo ml-2" style={{ width: 56, height: 56, borderRadius: 12, background: color }} aria-label="Fallback preview" role="img">
                    <span style={{ fontSize: 26 }}>{emoji || "🍹"}</span>
                  </div>
                </div>
                <span className="hint">Shown when there is no photo.</span>
              </div>
            </div>
          </section>

          {/* Options */}
          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Options and prices">
            <div className="flex items-baseline justify-between">
              <h2 className="h3">Options &amp; prices</h2>
              <span className="small muted">{drink ? "1 bottle = a single bottle" : "For example “1 kg cake”"}</span>
            </div>
            {err("options") && <span className="error-text">{err("options")}</span>}
            <div className="flex flex-col gap-2.5">
              {drink
                ? drinkRows.map((r, i) => {
                    const opt = { bottlesCount: num(r.bottles) || 1, volumeMl: Math.round(r.unit === "L" ? num(r.vol) * 1000 : num(r.vol)) || null, label: null, price: num(r.price) || 0 };
                    const per = perBottleLabel("drink", opt);
                    const update = (patch: Partial<DrinkRow>) => setDrinkRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, ...patch } : x)));
                    return (
                      <div key={r.key} className="grid items-end gap-2.5 rounded-xl p-3 sm:grid-cols-[110px_110px_96px_1fr_auto]" style={{ background: "var(--surface-2)" }}>
                        <div className="field">
                          <label className="label" htmlFor={`b${r.key}`}>
                            Bottles
                          </label>
                          <input id={`b${r.key}`} className="input num" type="number" min={1} value={r.bottles} onChange={(e) => update({ bottles: e.target.value })} style={{ minHeight: 44 }} />
                        </div>
                        <div className="field">
                          <label className="label" htmlFor={`v${r.key}`}>
                            Volume each
                          </label>
                          <input id={`v${r.key}`} className={err(`options.${i}.volumeMl`) ? "input num is-error" : "input num"} type="number" min={0} step="any" value={r.vol} onChange={(e) => update({ vol: e.target.value })} style={{ minHeight: 44 }} />
                        </div>
                        <div className="field">
                          <label className="label" htmlFor={`u${r.key}`}>
                            Unit
                          </label>
                          <div className="select-wrap">
                            <select id={`u${r.key}`} className="input" value={r.unit} onChange={(e) => update({ unit: e.target.value as Unit })} style={{ minHeight: 44, paddingRight: 30 }}>
                              <option value="ml">ml</option>
                              <option value="L">L</option>
                            </select>
                            <ChevronDownIcon size={16} style={{ right: 10 }} />
                          </div>
                        </div>
                        <PriceField id={`pr${r.key}`} value={r.price} onChange={(price) => update({ price })} error={err(`options.${i}.price`)} />
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDrinkRows((rows) => rows.filter((x) => x.key !== r.key))} aria-label={`Remove option ${optionLabel("drink", opt)}`} style={{ color: "var(--berry-text)", minHeight: 44 }}>
                          Remove
                        </button>
                        <span className="hint sm:col-span-5">
                          Shows as: {optionLabel("drink", opt)} · {opt.price ? formatKES(opt.price) : "no price yet"}
                          {per ? ` · ${per}` : ""}
                        </span>
                      </div>
                    );
                  })
                : otherRows.map((r, i) => {
                    const update = (patch: Partial<OtherRow>) => setOtherRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, ...patch } : x)));
                    return (
                      <div key={r.key} className="grid items-end gap-2.5 rounded-xl p-3 sm:grid-cols-[1fr_200px_auto]" style={{ background: "var(--surface-2)" }}>
                        <div className="field">
                          <label className="label" htmlFor={`sz${r.key}`}>
                            Size or description
                          </label>
                          <input id={`sz${r.key}`} className={err(`options.${i}.label`) ? "input is-error" : "input"} value={r.label} onChange={(e) => update({ label: e.target.value })} style={{ minHeight: 44 }} />
                        </div>
                        <PriceField id={`op${r.key}`} value={r.price} onChange={(price) => update({ price })} error={err(`options.${i}.price`)} />
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOtherRows((rows) => rows.filter((x) => x.key !== r.key))} aria-label={`Remove option ${r.label}`} style={{ color: "var(--berry-text)", minHeight: 44 }}>
                          Remove
                        </button>
                        {err(`options.${i}.label`) && <span className="error-text sm:col-span-3">{err(`options.${i}.label`)}</span>}
                      </div>
                    );
                  })}
            </div>
            <button
              className="btn btn-secondary self-start"
              type="button"
              onClick={() => (drink ? setDrinkRows((rows) => [...rows, { key: key(), bottles: "1", vol: "330", unit: "ml", price: "" }]) : setOtherRows((rows) => [...rows, { key: key(), label: "", price: "" }]))}
            >
              <PlusIcon size={18} />
              Add another option
            </button>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {/* Availability */}
          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Availability">
            <h2 className="h3">Availability</h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Availability">
              {AVAILS.map(([id, label, help]) => (
                <button key={id} className={id === availability ? "choice on" : "choice"} type="button" role="radio" aria-checked={id === availability} onClick={() => setAvailability(id)} style={{ padding: 12 }}>
                  <span className="radio" />
                  <span className="flex flex-col">
                    <span className="strong" style={{ fontSize: 15 }}>
                      {label}
                    </span>
                    <span className="small muted">{help}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Photos */}
          <section className="panel flex flex-col gap-4 p-[22px]" aria-label="Photos">
            <div className="flex items-baseline justify-between">
              <h2 className="h3">Photos</h2>
              <span className="small muted">
                {photos.length} of {MAX_PHOTOS}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((ph, i) => {
                const isPrimary = i === primary;
                return (
                  <div key={ph.url} className="flex flex-col gap-1.5">
                    <div className="photo" style={{ height: 120, borderRadius: 12, boxShadow: isPrimary ? "inset 0 0 0 3px var(--green)" : "none" }}>
                      <Image src={ph.url} alt={`Photo ${i + 1}`} fill sizes="160px" className="object-cover" style={{ borderRadius: 12 }} unoptimized={ph.url.startsWith("/api/")} />
                      {isPrimary && (
                        <span className="badge badge-primary" style={{ position: "absolute", left: 8, top: 8, height: 24, fontSize: 12 }}>
                          <StarIcon />
                          Primary photo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!isPrimary && (
                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPrimary(i)} style={{ flex: 1, padding: "0 8px", fontSize: 13 }}>
                          Make primary
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removePhoto(i)} style={{ color: "var(--berry-text)", padding: "0 8px", fontSize: 13, flex: isPrimary ? 1 : "0 0 auto" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                  style={{ height: 120, borderRadius: 12, border: "2px dashed var(--line-strong)", background: "transparent", color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, font: "inherit", cursor: "pointer" }}
                >
                  <UploadIcon size={24} />
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{uploading ? "Uploading…" : "Add photos"}</span>
                  <span style={{ fontSize: 12 }}>JPG or PNG, up to 5 MB</span>
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files)} />
            </div>
            {errors.photos && <span className="error-text">{errors.photos}</span>}
            <p className="hint">The primary photo shows on the product card and in the cart.</p>
          </section>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-[18px]" style={{ borderTop: "1px solid var(--line)" }}>
        {actions}
      </div>
    </form>
  );
}

function PriceField({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        Price
      </label>
      <div className="input-group">
        <span className="prefix" style={{ fontSize: 14 }}>
          KES
        </span>
        <input id={id} className={error ? "input num is-error" : "input num"} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} style={{ minHeight: 44 }} aria-invalid={!!error} />
      </div>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

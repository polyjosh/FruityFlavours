"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { BinIcon, PlusIcon } from "@/components/icons";
import { PencilIcon } from "./icons";

type Availability = "on_sale" | "out_of_stock" | "coming_soon" | "hidden";

export interface CatalogRow {
  id: string;
  name: string;
  category: string;
  availability: Availability;
  emoji: string | null;
  color: string | null;
  photo: string | null;
  options: { label: string; price: string }[];
}

const META: Record<Availability, { label: string; chip: string }> = {
  on_sale: { label: "On sale", chip: "chip chip-ready" },
  out_of_stock: { label: "Out of stock", chip: "chip chip-cancel" },
  coming_soon: { label: "Coming soon", chip: "chip chip-prep" },
  hidden: { label: "Hidden", chip: "chip chip-await" },
};

export function CatalogTable({ rows: initial }: { rows: CatalogRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState("All");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [...new Set(rows.map((r) => r.category))];
  const visible = rows.filter((r) =>
    filter === "All" ? true : filter === "Unavailable" ? r.availability !== "on_sale" : r.category === filter,
  );

  async function toggleStock(r: CatalogRow) {
    const availability: Availability = r.availability === "out_of_stock" ? "on_sale" : "out_of_stock";
    setBusy(r.id);
    setError(null);
    const res = await fetch(`/api/admin/products/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ availability }) });
    setBusy(null);
    if (!res.ok) return setError("Couldn’t update that product. Please try again.");
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, availability } : x)));
    router.refresh();
  }

  async function remove(r: CatalogRow) {
    if (confirm !== r.id) return setConfirm(r.id);
    setBusy(r.id);
    setError(null);
    const res = await fetch(`/api/admin/products/${r.id}`, { method: "DELETE" });
    setBusy(null);
    setConfirm(null);
    if (!res.ok) return setError("Couldn’t delete that product. Please try again.");
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="mr-auto">
          <h1 className="h1">Catalog</h1>
          <p className="small muted">
            {rows.length} products · {rows.filter((r) => r.availability === "on_sale").length} on sale
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/catalog/new">
          <PlusIcon size={18} />
          Add product
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter products">
        {["All", ...categories, "Unavailable"].map((f) => (
          <button key={f} className={f === filter ? "pill pill-sm on" : "pill pill-sm"} type="button" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      {error && (
        <p className="notice notice-berry" role="alert">
          {error}
        </p>
      )}
      <section className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col" style={{ paddingLeft: 18 }}>
                Product
              </th>
              <th scope="col">Options &amp; prices</th>
              <th scope="col">Availability</th>
              <th scope="col" className="r" style={{ paddingRight: 18 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 32, textAlign: "center" }}>
                  No products here.
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const meta = META[r.availability];
              const canStock = r.availability === "on_sale" || r.availability === "out_of_stock";
              return (
                <tr key={r.id} style={{ verticalAlign: "middle" }}>
                  <td style={{ paddingLeft: 18, verticalAlign: "middle" }}>
                    <div className="flex items-center gap-3">
                      <ProductImage name={r.name} photo={r.photo} emoji={r.emoji} color={r.color} size={48} greyscale={r.availability === "out_of_stock"} />
                      <div className="flex flex-col gap-1">
                        <span className="strong">{r.name}</span>
                        <span className="badge badge-cat self-start" style={{ height: 22, fontSize: 12 }}>
                          {r.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <ul className="flex flex-col gap-0.5">
                      {r.options.map((o, i) => (
                        <li key={i} className="small whitespace-nowrap">
                          <span className="muted">{o.label}</span> ·{" "}
                          <span className="num" style={{ fontWeight: 650 }}>
                            {o.price}
                          </span>
                        </li>
                      ))}
                      {r.options.length === 0 && <li className="small muted">No options yet</li>}
                    </ul>
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span className={meta.chip}>{meta.label}</span>
                  </td>
                  <td className="r" style={{ paddingRight: 18, verticalAlign: "middle" }}>
                    <div className="flex justify-end gap-1.5">
                      {canStock && (
                        <button className="btn btn-secondary btn-sm" type="button" style={{ minWidth: 150 }} disabled={busy === r.id} onClick={() => toggleStock(r)}>
                          {r.availability === "out_of_stock" ? "Back in stock" : "Mark out of stock"}
                        </button>
                      )}
                      <Link className="btn btn-secondary btn-sm" href={`/admin/catalog/${r.id}`} aria-label={`Edit ${r.name}`}>
                        <PencilIcon size={16} />
                        Edit
                      </Link>
                      {confirm === r.id ? (
                        <button className="btn btn-danger btn-sm" type="button" disabled={busy === r.id} onClick={() => remove(r)} onBlur={() => setConfirm(null)}>
                          Tap again to confirm
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" type="button" aria-label={`Delete ${r.name}`} style={{ color: "var(--berry-text)" }} onClick={() => remove(r)}>
                          <BinIcon size={16} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

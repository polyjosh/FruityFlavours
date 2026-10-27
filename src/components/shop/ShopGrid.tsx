"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShopProduct } from "@/lib/shared/types";
import { formatKES } from "@/lib/shared/money";
import { useCart } from "@/components/cart/CartProvider";
import { CartIcon, CheckIcon } from "@/components/icons";
import { ProductCard } from "./ProductCard";

const TOAST_MS = 2600;

export function ShopGrid({ products }: { products: ShopProduct[] }) {
  const { count, subtotal, ready } = useCart();
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const [category, setCategory] = useState("All");
  const [toast, setToast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function showToast() {
    setToast(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(false), TOAST_MS);
  }

  const visible = category === "All" ? products : products.filter((p) => p.category === category);
  const pills =
    categories.length > 1 ? (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {["All", ...categories].map((c) => (
          <button key={c} type="button" className={c === category ? "pill on" : "pill"} aria-pressed={c === category} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <section id="menu" className="wrap flex scroll-mt-4 flex-col gap-4 pb-32 pt-5 md:gap-5 md:pb-[72px] md:pt-0" aria-label="Products">
      <div className="flex items-center justify-between gap-4">
        <h2 className="h1 md:mr-auto">Today’s menu</h2>
        <span className="small muted md:hidden">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </span>
        <div className="hidden md:block">{pills}</div>
      </div>
      <div className="md:hidden">{pills}</div>

      {products.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <p className="h2">Nothing on the menu right now</p>
          <p className="muted">Please check back soon.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} onAdded={showToast} />
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite">
        {toast && (
          <div className="toast fixed inset-x-4 bottom-24 z-50 md:inset-x-auto md:bottom-auto md:right-10 md:top-24 md:w-[360px]" role="status">
            <span className="t-icon">
              <CheckIcon size={16} strokeWidth={3} />
            </span>
            Added to cart
            <Link href="/cart">View cart</Link>
          </div>
        )}
      </div>

      {ready && count > 0 && (
        <Link className="fab md:hidden" href="/cart">
          <span className="flex items-center gap-2.5">
            <CartIcon size={22} />
            Cart ({count})
          </span>
          <span className="num">{formatKES(subtotal)}</span>
        </Link>
      )}
    </section>
  );
}

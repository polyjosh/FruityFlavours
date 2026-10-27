"use client";

import { useState } from "react";
import type { ShopProduct } from "@/lib/shared/types";
import { formatKES } from "@/lib/shared/money";
import { useCart } from "@/components/cart/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import { CheckIcon } from "@/components/icons";

export function ProductCard({ product, onAdded }: { product: ShopProduct; onAdded: () => void }) {
  const { add } = useCart();
  const [optionId, setOptionId] = useState(product.options[0]?.id ?? null);
  const [added, setAdded] = useState(false);

  const option = product.options.find((o) => o.id === optionId) ?? null;
  const oos = product.availability === "out_of_stock";
  const soon = product.availability === "coming_soon" || !option;
  const locked = oos || soon;
  const headingId = `p-${product.id}`;

  function choose(id: string) {
    setOptionId(id);
    setAdded(false);
  }

  function addToCart() {
    if (locked || !option) return;
    add({
      optionId: option.id,
      productId: product.id,
      productName: product.name,
      optionLabel: option.label,
      unitPrice: option.price,
      emoji: product.emoji,
      color: product.color,
      photo: product.photo,
    });
    setAdded(true);
    onAdded();
  }

  return (
    <article className="card flex flex-col overflow-hidden" aria-labelledby={headingId}>
      <div className="relative">
        <ProductImage name={product.name} photo={product.photo} emoji={product.emoji} color={product.color} greyscale={oos} className="h-[168px] md:h-[220px]" />
        {oos && (
          <span className="badge badge-oos absolute left-3 top-3 md:left-3.5 md:top-3.5">Out of stock</span>
        )}
        {product.availability === "coming_soon" && (
          <span className="badge badge-soon absolute left-3 top-3 md:left-3.5 md:top-3.5">Coming soon</span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 md:p-[18px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 id={headingId} className="h2">
            {product.name}
          </h3>
          <span className="h3 num whitespace-nowrap" style={{ fontWeight: 750, color: soon ? "var(--orange-text)" : "var(--text)" }}>
            {soon || !option ? "Price soon" : formatKES(option.price)}
          </span>
        </div>

        {product.ingredients.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Ingredients">
            {product.ingredients.map((i) => (
              <li key={i} className="tag">
                {i}
              </li>
            ))}
          </ul>
        )}

        {product.description && <p className="small muted">{product.description}</p>}

        {product.options.length > 1 && (
          <div className="flex flex-col gap-2" role="group" aria-label="Choose an option">
            {product.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={o.id === optionId ? "opt on" : "opt"}
                aria-pressed={o.id === optionId}
                disabled={locked}
                onClick={() => choose(o.id)}
              >
                <span className="radio" />
                <span className="opt-body">
                  <span className="opt-title">{o.title}</span>
                  {o.sub && <span className="opt-sub">{o.sub}</span>}
                </span>
                <span className="opt-price">{formatKES(o.price)}</span>
              </button>
            ))}
          </div>
        )}
        {product.options.length === 1 && option && (
          <p className="small" style={{ fontWeight: 600 }}>
            {option.sub ? `${option.title} · ${option.sub}` : option.title}
          </p>
        )}

        {oos ? (
          <button className="btn btn-oos btn-block" type="button" disabled>
            Out of stock
          </button>
        ) : soon ? (
          <button className="btn btn-soon btn-block" type="button" disabled>
            Coming soon
          </button>
        ) : added ? (
          <button className="btn btn-added btn-block" type="button" onClick={addToCart}>
            <CheckIcon size={18} />
            Added to cart · add another
          </button>
        ) : (
          <button className="btn btn-primary btn-block" type="button" onClick={addToCart}>
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}

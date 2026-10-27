"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Client-side cart. Prices here are for display only; the server re-prices every line. */
export interface CartLine {
  optionId: string;
  productId: string;
  productName: string;
  optionLabel: string;
  unitPrice: number;
  quantity: number;
  emoji: string | null;
  color: string | null;
  photo: string | null;
}

interface CartContextValue {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">) => void;
  setQuantity: (optionId: string, quantity: number) => void;
  remove: (optionId: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
}

const STORAGE_KEY = "ff-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "quantity">) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.optionId === line.optionId);
      if (existing) return prev.map((l) => (l.optionId === line.optionId ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { ...line, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((optionId: string) => {
    setLines((prev) => prev.filter((l) => l.optionId !== optionId));
  }, []);

  const setQuantity = useCallback((optionId: string, quantity: number) => {
    setLines((prev) =>
      quantity < 1
        ? prev.filter((l) => l.optionId !== optionId)
        : prev.map((l) => (l.optionId === optionId ? { ...l, quantity: Math.min(quantity, 50) } : l)),
    );
  }, []);

  const replace = useCallback((next: CartLine[]) => setLines(next), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0),
      add,
      setQuantity,
      remove,
      replace,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, replace, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

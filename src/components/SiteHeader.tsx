"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { CartIcon, PinIcon } from "./icons";
import { useCart } from "./cart/CartProvider";
import { formatKES } from "@/lib/shared/money";

function Nav() {
  const path = usePathname();
  const account = path.startsWith("/account");
  return (
    <nav className="flex gap-0.5 md:mr-auto md:gap-1" aria-label="Main">
      <Link className={account ? "hnav" : "hnav on"} href="/" aria-current={account ? undefined : "page"}>
        Shop
      </Link>
      <Link className={account ? "hnav on" : "hnav"} href="/account" aria-current={account ? "page" : undefined}>
        Account
      </Link>
    </nav>
  );
}

/** Shop header: icon cart with count on mobile, "Cart (n) · KES total" button on desktop. */
export function SiteHeader() {
  const { count, subtotal, ready } = useCart();
  const n = ready ? count : 0;
  return (
    <header style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      {/* mobile */}
      <div className="flex items-center gap-1.5 px-4 py-3 md:hidden">
        <Logo width={92} className="mr-auto" />
        <Nav />
        <Link className="icon-btn" href="/cart" aria-label={`Cart, ${n} items`}>
          <CartIcon size={22} />
          {n > 0 && <span className="count">{n}</span>}
        </Link>
      </div>
      {/* desktop */}
      <div className="wrap hidden h-20 items-center gap-6 md:flex">
        <Logo width={120} />
        <Nav />
        <span className="small muted hidden items-center gap-1.5 lg:flex">
          <PinIcon size={16} />
          Delivering around Ongata Rongai
        </span>
        <Link className="btn btn-primary" href="/cart">
          <CartIcon />
          <span className="num">
            Cart ({n}) · {formatKES(ready ? subtotal : 0)}
          </span>
        </Link>
      </div>
    </header>
  );
}

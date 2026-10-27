"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoImage } from "@/components/Logo";
import { CatalogIcon, ExternalIcon, MessageIcon, OrdersIcon, ReportsIcon, SettingsIcon } from "./icons";

const LINKS = [
  { href: "/admin/orders", label: "Orders", Icon: OrdersIcon },
  { href: "/admin/catalog", label: "Catalog", Icon: CatalogIcon },
  { href: "/admin/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/admin/notifications", label: "Notifications", Icon: MessageIcon },
  { href: "/admin/settings", label: "Settings", Icon: SettingsIcon },
];

/** Admin side navigation (design: .side / .nav). Collapses to a scrolling top bar on small screens. */
export function AdminSidebar({ newOrders }: { newOrders: number }) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const links = LINKS.map(({ href, label, Icon }) => {
    const on = path.startsWith(href);
    return (
      <Link key={href} className={on ? "nav on" : "nav"} href={href} aria-current={on ? "page" : undefined}>
        <Icon />
        {label}
        {href === "/admin/orders" && newOrders > 0 && (
          <span className="n" aria-label={`${newOrders} new`}>
            {newOrders}
          </span>
        )}
      </Link>
    );
  });

  return (
    <>
      <aside className="side sticky top-0 hidden h-screen lg:flex" aria-label="Admin">
        <LogoImage width={104} className="mb-1 ml-2.5" />
        <span className="micro muted" style={{ padding: "0 12px 14px" }}>
          Admin
        </span>
        {links}
        <div className="mt-auto flex flex-col gap-1">
          <a className="nav" href="/" target="_blank" rel="noopener">
            <ExternalIcon />
            View shop
          </a>
          <button type="button" className="nav" onClick={signOut} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}>
            Sign out
          </button>
        </div>
      </aside>
      <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2 lg:hidden" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }} aria-label="Admin">
        {links}
        <button type="button" className="nav whitespace-nowrap" onClick={signOut} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit" }}>
          Sign out
        </button>
      </nav>
    </>
  );
}

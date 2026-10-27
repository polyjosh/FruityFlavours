import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/server/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in · FruityFlavours", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Split screen from design/screens/Admin-SignIn.dc.html. */
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin/orders");
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-14 md:flex" style={{ background: "#2f6b3c", color: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="FruityFlavours" style={{ width: 200, filter: "brightness(0) invert(1)" }} />
        <svg width="420" height="300" viewBox="0 0 300 170" aria-hidden="true" style={{ position: "absolute", right: -40, bottom: 120, opacity: 0.22 }}>
          <circle cx="40" cy="140" r="34" fill="#f0992b" />
          <circle cx="262" cy="136" r="30" fill="#8cbf4a" />
          <path d="M88 20h22v16c0 6 14 12 14 30v92H74V66c0-18 14-24 14-30z" fill="#ffffff" />
          <path d="M140 8h22v16c0 6 14 12 14 30v104h-50V54c0-18 14-24 14-30z" fill="#ffffff" />
          <path d="M192 24h22v16c0 6 14 12 14 30v88h-50V70c0-18 14-24 14-30z" fill="#ffffff" />
        </svg>
        <div className="relative flex flex-col gap-2.5">
          <p className="display">Mautamu Healthy.</p>
          <p style={{ fontSize: 17, opacity: 0.9 }}>Shop admin · orders, catalog and reports.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <AdminLoginForm />
      </div>
    </div>
  );
}

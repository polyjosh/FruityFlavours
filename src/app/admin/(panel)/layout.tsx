import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { adminOrderCounts } from "@/lib/server/orders";
import { DemoStrip } from "@/components/DemoStrip";

export const metadata: Metadata = { title: "Admin · FruityFlavours", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = await adminOrderCounts();
  return (
    <>
      <DemoStrip />
      <div className="lg:flex" style={{ fontSize: 15 }}>
        <AdminSidebar newOrders={counts.new} />
        <main className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pb-10 pt-6 md:px-7">{children}</main>
      </div>
    </>
  );
}

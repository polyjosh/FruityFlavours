import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoStrip } from "@/components/DemoStrip";
import { getDeliveryFee, getPickupPoints, getSocialLinks } from "@/lib/server/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [socials, pickupPoints, deliveryFee] = await Promise.all([getSocialLinks(), getPickupPoints(), getDeliveryFee()]);
  return (
    <>
      <a href="#main" className="btn btn-secondary btn-sm sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
        Skip to content
      </a>
      <DemoStrip />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter socials={socials} pickupPoints={pickupPoints} deliveryFee={deliveryFee} />
    </>
  );
}

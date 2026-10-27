import { getShopProducts } from "@/lib/server/catalog";
import { getDeliveryFee } from "@/lib/server/settings";
import { Hero } from "@/components/shop/Hero";
import { ShopGrid } from "@/components/shop/ShopGrid";

export const dynamic = "force-dynamic";

export default async function ShopHome() {
  const [products, deliveryFee] = await Promise.all([getShopProducts(), getDeliveryFee()]);
  return (
    <>
      <Hero deliveryFee={deliveryFee} />
      <ShopGrid products={products} />
    </>
  );
}

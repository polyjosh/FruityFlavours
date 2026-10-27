import type { Metadata } from "next";
import { getDeliveryFee, getPickupPoints } from "@/lib/server/settings";
import { currentUser } from "@/lib/server/auth";
import { CartCheckout, type CheckoutPrefill } from "./CartCheckout";

export const metadata: Metadata = { title: "Cart & checkout · FruityFlavours" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [deliveryFee, pickupPoints, user] = await Promise.all([getDeliveryFee(), getPickupPoints(), currentUser()]);
  const address = user?.addresses[0];
  const prefill: CheckoutPrefill | null = user
    ? {
        name: user.name,
        // Shown after the +254 prefix.
        phone: user.phone.replace(/^\+254/, "").replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3"),
        email: user.email ?? "",
        address: address && address.line1 !== "Shared location" ? address.line1 : "",
        lat: address?.lat ?? null,
        lng: address?.lng ?? null,
      }
    : null;
  return <CartCheckout deliveryFee={deliveryFee} pickupPoints={pickupPoints} prefill={prefill} />;
}

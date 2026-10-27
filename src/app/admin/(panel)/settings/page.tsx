import { getDeliveryFee, getPickupPoints, getSocialLinks } from "@/lib/server/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [deliveryFee, pickupPoints, socialLinks] = await Promise.all([getDeliveryFee(), getPickupPoints(), getSocialLinks()]);
  return <SettingsForm deliveryFee={deliveryFee} pickupPoints={pickupPoints.map((p) => ({ id: p.id, name: p.name }))} socialLinks={socialLinks} />;
}

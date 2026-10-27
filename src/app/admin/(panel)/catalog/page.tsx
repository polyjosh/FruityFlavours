import { getAdminProducts } from "@/lib/server/catalog";
import { CatalogTable, type CatalogRow } from "@/components/admin/CatalogTable";
import { formatKES } from "@/lib/shared/money";
import { formatVolume } from "@/lib/shared/options";

export default async function AdminCatalogPage() {
  const products = await getAdminProducts();
  const rows: CatalogRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category.name,
    availability: p.availability,
    emoji: p.emoji,
    color: p.color,
    photo: p.photos[0]?.url ?? null,
    options: p.options.map((o) => ({
      // Compact admin form, as in the design: "Single, 500 ml", "7 × 70 ml", "1 kg cake".
      label:
        p.type === "other"
          ? (o.label ?? "")
          : (o.bottlesCount ?? 1) > 1
            ? `${o.bottlesCount} × ${o.volumeMl ? formatVolume(o.volumeMl) : "bottle"}`
            : `Single${o.volumeMl ? `, ${formatVolume(o.volumeMl)}` : ""}`,
      price: o.price > 0 ? formatKES(o.price) : "Price not set",
    })),
  }));
  return <CatalogTable rows={rows} />;
}

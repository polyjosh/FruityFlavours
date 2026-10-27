import { getCategoryNames } from "@/lib/server/catalog";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function NewProductPage() {
  const categories = (await getCategoryNames()).filter((c) => c !== "Drinks");
  return <ProductEditor product={null} categories={categories} />;
}

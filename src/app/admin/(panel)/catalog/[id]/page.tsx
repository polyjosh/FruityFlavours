import { notFound } from "next/navigation";
import { getCategoryNames, getProductForEditor } from "@/lib/server/catalog";
import { ProductEditor } from "@/components/admin/ProductEditor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [product, categories] = await Promise.all([getProductForEditor(id), getCategoryNames()]);
  if (!product) notFound();
  return <ProductEditor product={product} categories={categories.filter((c) => c !== "Drinks")} />;
}

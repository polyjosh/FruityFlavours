import { formatKES } from "./money";

export type ProductType = "drink" | "other";

export interface OptionInput {
  bottlesCount: number | null;
  volumeMl: number | null;
  label: string | null;
  price: number;
}

/** 70 -> "70 ml", 1000 -> "1 L", 1500 -> "1.5 L". */
export function formatVolume(ml: number): string {
  if (ml >= 1000) {
    const litres = Math.round((ml / 1000) * 100) / 100;
    return `${litres} L`;
  }
  return `${ml} ml`;
}

/** One line: "Single bottle, 500 ml" or "Pack of 7 bottles, 70 ml each". Other products use their label. */
export function optionLabel(type: ProductType, opt: OptionInput): string {
  if (type === "other") return opt.label?.trim() || "";
  const bottles = opt.bottlesCount ?? 1;
  const volume = opt.volumeMl ? formatVolume(opt.volumeMl) : null;
  if (bottles <= 1) return volume ? `Single bottle, ${volume}` : "Single bottle";
  return volume ? `Pack of ${bottles} bottles, ${volume} each` : `Pack of ${bottles} bottles`;
}

/** "KES 214 a bottle" for packs, otherwise null. */
export function perBottleLabel(type: ProductType, opt: OptionInput): string | null {
  if (type !== "drink" || !opt.bottlesCount || opt.bottlesCount <= 1) return null;
  return `${formatKES(Math.round(opt.price / opt.bottlesCount))} a bottle`;
}

/**
 * Option button text, as in the shop design:
 * title "Pack of 7 bottles", sub "70 ml each · KES 214 a bottle". Other products have no sub line.
 */
export function optionParts(type: ProductType, opt: OptionInput): { title: string; sub: string | null } {
  if (type === "other") return { title: opt.label?.trim() || "", sub: null };
  const bottles = opt.bottlesCount ?? 1;
  const volume = opt.volumeMl ? formatVolume(opt.volumeMl) : null;
  if (bottles <= 1) return { title: "Single bottle", sub: volume };
  const per = perBottleLabel(type, opt);
  const sub = [volume ? `${volume} each` : null, per].filter(Boolean).join(" · ");
  return { title: `Pack of ${bottles} bottles`, sub: sub || null };
}

/** Compact form for order summaries: "500 ml", "Pack of 7 × 70 ml", "1 kg cake". */
export function shortOptionLabel(type: ProductType, opt: Omit<OptionInput, "price">): string {
  if (type === "other") return opt.label?.trim() || "";
  const bottles = opt.bottlesCount ?? 1;
  const volume = opt.volumeMl ? formatVolume(opt.volumeMl) : null;
  if (bottles <= 1) return volume ?? "Single bottle";
  return volume ? `Pack of ${bottles} × ${volume}` : `Pack of ${bottles}`;
}

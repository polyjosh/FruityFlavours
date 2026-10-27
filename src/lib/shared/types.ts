import type { Availability, Fulfilment } from "./pricing";
import type { ProductType } from "./options";

/** Product as sent to the shop (serialisable, hidden products never included). */
export interface ShopOption {
  id: string;
  /** Option button title, e.g. "Pack of 7 bottles". */
  title: string;
  /** Option button sub line, e.g. "70 ml each · KES 214 a bottle". */
  sub: string | null;
  /** One-line label used in the cart, e.g. "Pack of 7 bottles, 70 ml each". */
  label: string;
  price: number;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  category: string;
  description: string;
  emoji: string | null;
  color: string | null;
  availability: Exclude<Availability, "hidden">;
  ingredients: string[];
  photo: string | null;
  options: ShopOption[];
}

export interface PickupPointView {
  id: string;
  name: string;
  address: string | null;
  openingHours: string | null;
}

/** A cart line as re-priced by the server. */
export interface QuoteLine {
  optionId: string;
  productId: string | null;
  productName: string;
  optionLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  emoji: string | null;
  color: string | null;
  photo: string | null;
  available: boolean;
  reason: "not_found" | "out_of_stock" | "coming_soon" | "hidden" | null;
}

export interface QuoteResponse {
  lines: QuoteLine[];
  deliveryFee: number;
}

export type { Availability, Fulfilment, ProductType };

// Seed data shared by prisma/seed.ts and the in-memory demo mode (no DATABASE_URL).
// Taken from the sample menu in design/screens/Shop-*.dc.html. Replace through the admin catalog.
import type { Availability, ProductType } from "@prisma/client";

export interface SeedProduct {
  slug: string;
  name: string;
  type: ProductType;
  category: string;
  description: string;
  emoji: string;
  color: string;
  availability: Availability;
  ingredients: string[];
  options: { bottlesCount?: number; volumeMl?: number; label?: string; price: number }[];
}

export const seedCategories = ["Drinks", "Cakes"];

const juicePacks = (single: number, small: number, large: number) => [
  { bottlesCount: 1, volumeMl: 500, price: single },
  { bottlesCount: 7, volumeMl: 70, price: small },
  { bottlesCount: 7, volumeMl: 1000, price: large },
];

export const seedProducts: SeedProduct[] = [
  {
    slug: "green-glow",
    name: "Green Glow",
    type: "drink",
    category: "Drinks",
    description: "Crisp, bright and green. Our everyday reset.",
    emoji: "🥬",
    color: "#d5e8c0",
    availability: "on_sale",
    ingredients: ["Spinach", "Cucumber", "Green apple", "Lime", "Mint"],
    options: juicePacks(400, 1500, 2600),
  },
  {
    slug: "sunrise-mango",
    name: "Sunrise Mango",
    type: "drink",
    category: "Drinks",
    description: "Golden and zingy, with a little ginger kick.",
    emoji: "🥭",
    color: "#ffd59a",
    availability: "on_sale",
    ingredients: ["Mango", "Passion fruit", "Orange", "Ginger"],
    options: juicePacks(450, 1600, 2800),
  },
  {
    slug: "beet-boost",
    name: "Beet Boost",
    type: "drink",
    category: "Drinks",
    description: "Earthy, sweet and deep red. Great before a run.",
    emoji: "🍎",
    color: "#f3c6d0",
    availability: "on_sale",
    ingredients: ["Beetroot", "Carrot", "Apple", "Lemon"],
    options: juicePacks(400, 1500, 2600),
  },
  {
    slug: "berry-oat-smoothie",
    name: "Berry Oat Smoothie",
    type: "drink",
    category: "Drinks",
    description: "Thick and filling. Breakfast in a bottle.",
    emoji: "🫐",
    color: "#e6d3ea",
    availability: "on_sale",
    ingredients: ["Mixed berries", "Oats", "Banana", "Yoghurt"],
    options: [{ bottlesCount: 1, volumeMl: 350, price: 450 }],
  },
  {
    slug: "coconut-cooler",
    name: "Coconut Cooler",
    type: "drink",
    category: "Drinks",
    description: "Light and hydrating. Back very soon.",
    emoji: "🥥",
    color: "#ece6d8",
    availability: "out_of_stock",
    ingredients: ["Coconut water", "Lime", "Mint"],
    options: [{ bottlesCount: 1, volumeMl: 500, price: 380 }],
  },
  {
    slug: "pineapple-mint-fizz",
    name: "Pineapple Mint Fizz",
    type: "drink",
    category: "Drinks",
    description: "A sparkling one for hot Rongai afternoons.",
    emoji: "🍍",
    color: "#f6eaa6",
    availability: "coming_soon",
    ingredients: ["Pineapple", "Mint", "Sparkling water"],
    options: [{ bottlesCount: 1, volumeMl: 330, price: 0 }],
  },
  {
    slug: "carrot-cake",
    name: "Carrot Cake",
    type: "other",
    category: "Cakes",
    description: "Moist, spiced and topped with cream cheese frosting.",
    emoji: "🍰",
    color: "#f5d3b0",
    availability: "on_sale",
    ingredients: ["Carrot", "Walnut", "Cinnamon", "Cream cheese"],
    options: [
      { label: "500 g cake", price: 1200 },
      { label: "1 kg cake", price: 2200 },
      { label: "2 kg cake", price: 4000 },
    ],
  },
];

export const seedPickupPoints = [
  { name: "Main shop – Ongata Rongai", openingHours: "Every day, 7 am to 7 pm" },
  { name: "Rongai Gate Kiosk", openingHours: "Every day, 7 am to 7 pm" },
];

export const seedDeliveryFee = 150;

export const seedSocialLinks = { instagram: "", facebook: "", tiktok: "", x: "", youtube: "", whatsapp: "" };

import { normalizeKenyanPhone } from "./phone";

export type SocialKey = "instagram" | "facebook" | "tiktok" | "x" | "youtube" | "whatsapp";
export type SocialLinks = Record<SocialKey, string>;

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

const BASES: Record<Exclude<SocialKey, "whatsapp">, string> = {
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  tiktok: "https://www.tiktok.com/@",
  x: "https://x.com/",
  youtube: "https://www.youtube.com/@",
};

/** Accepts a handle (@fruityflavours) or a full link. WhatsApp takes a phone number. Empty -> null. */
export function socialUrl(key: SocialKey, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (key === "whatsapp") {
    if (/^https?:\/\//i.test(v)) return v;
    const phone = normalizeKenyanPhone(v);
    return phone ? `https://wa.me/${phone.slice(1)}` : null;
  }
  if (/^https?:\/\//i.test(v)) return v;
  return BASES[key] + v.replace(/^@/, "");
}

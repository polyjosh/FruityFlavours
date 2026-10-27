import { describe, expect, it } from "vitest";
import { socialUrl } from "./social";

describe("socialUrl", () => {
  it("turns handles into links", () => {
    expect(socialUrl("instagram", "@fruityflavours")).toBe("https://instagram.com/fruityflavours");
    expect(socialUrl("tiktok", "fruityflavours")).toBe("https://www.tiktok.com/@fruityflavours");
  });

  it("keeps full links", () => {
    expect(socialUrl("facebook", "https://facebook.com/ff")).toBe("https://facebook.com/ff");
  });

  it("builds WhatsApp links from Kenyan numbers", () => {
    expect(socialUrl("whatsapp", "0712 345 678")).toBe("https://wa.me/254712345678");
  });

  it("hides empty values", () => {
    expect(socialUrl("x", "  ")).toBeNull();
  });
});

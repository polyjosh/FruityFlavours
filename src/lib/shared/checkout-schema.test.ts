import { describe, expect, it } from "vitest";
import { placeOrderSchema } from "./checkout-schema";

const base = {
  name: "Wanjiru",
  phone: "0712 345 678",
  paymentMethod: "cod" as const,
  lines: [{ optionId: "7d3b0b8e-6a52-4c2a-9a0e-2f1a3b4c5d6e", quantity: 2 }],
};

describe("placeOrderSchema", () => {
  it("normalises the phone number", () => {
    const r = placeOrderSchema.parse({ ...base, fulfilment: "delivery", address: "Kware, near the stage" });
    expect(r.phone).toBe("+254712345678");
    expect(r.email).toBeUndefined();
  });

  it("needs an address or a location pin for delivery", () => {
    expect(placeOrderSchema.safeParse({ ...base, fulfilment: "delivery" }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, fulfilment: "delivery", lat: -1.39, lng: 36.76 }).success).toBe(true);
  });

  it("needs a pickup point for pickup", () => {
    expect(placeOrderSchema.safeParse({ ...base, fulfilment: "pickup" }).success).toBe(false);
    expect(
      placeOrderSchema.safeParse({ ...base, fulfilment: "pickup", pickupPointId: "0b8e7d3b-6a52-4c2a-9a0e-2f1a3b4c5d6e" })
        .success,
    ).toBe(true);
  });

  it("rejects bad phone numbers and empty carts", () => {
    expect(placeOrderSchema.safeParse({ ...base, phone: "123", fulfilment: "delivery", address: "x" }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, lines: [], fulfilment: "delivery", address: "x" }).success).toBe(false);
  });
});

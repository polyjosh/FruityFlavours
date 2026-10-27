import { describe, expect, it } from "vitest";
import { formatKES } from "./money";
import { formatVolume, optionLabel, optionParts, perBottleLabel, shortOptionLabel } from "./options";
import { canOrder, computeTotals, formatOrderNo } from "./pricing";
import { maskPhone, normalizeKenyanPhone, toDarajaMsisdn } from "./phone";

describe("formatKES", () => {
  it("uses en-US grouping and no decimals", () => {
    expect(formatKES(1500)).toBe("KES 1,500");
    expect(formatKES(150)).toBe("KES 150");
    expect(formatKES(1234567)).toBe("KES 1,234,567");
  });
});

describe("option labels", () => {
  it("formats volumes", () => {
    expect(formatVolume(70)).toBe("70 ml");
    expect(formatVolume(1000)).toBe("1 L");
    expect(formatVolume(1500)).toBe("1.5 L");
  });

  it("labels single bottles and packs", () => {
    expect(optionLabel("drink", { bottlesCount: 1, volumeMl: 500, label: null, price: 350 })).toBe(
      "Single bottle, 500 ml",
    );
    expect(optionLabel("drink", { bottlesCount: 7, volumeMl: 70, label: null, price: 1500 })).toBe(
      "Pack of 7 bottles, 70 ml each",
    );
  });

  it("adds the rounded per-bottle price for packs only", () => {
    const pack = { bottlesCount: 7, volumeMl: 70, label: null, price: 1500 };
    expect(perBottleLabel("drink", pack)).toBe("KES 214 a bottle");
    expect(optionParts("drink", pack)).toEqual({ title: "Pack of 7 bottles", sub: "70 ml each · KES 214 a bottle" });
    expect(optionParts("drink", { ...pack, bottlesCount: 1, volumeMl: 500 })).toEqual({ title: "Single bottle", sub: "500 ml" });
    expect(optionParts("drink", { ...pack, volumeMl: 1000, price: 2600 }).sub).toBe("1 L each · KES 371 a bottle");
    expect(perBottleLabel("drink", { ...pack, bottlesCount: 1 })).toBeNull();
  });

  it("uses the free-text label for other products", () => {
    expect(optionLabel("other", { bottlesCount: null, volumeMl: null, label: "1 kg cake", price: 1800 })).toBe(
      "1 kg cake",
    );
  });
});

describe("shortOptionLabel", () => {
  it("makes compact summary labels", () => {
    expect(shortOptionLabel("drink", { bottlesCount: 7, volumeMl: 70, label: null })).toBe("Pack of 7 × 70 ml");
    expect(shortOptionLabel("drink", { bottlesCount: 1, volumeMl: 500, label: null })).toBe("500 ml");
    expect(shortOptionLabel("other", { bottlesCount: null, volumeMl: null, label: "1 kg cake" })).toBe("1 kg cake");
  });
});

describe("totals", () => {
  const lines = [
    { unitPrice: 350, quantity: 2 },
    { unitPrice: 1500, quantity: 1 },
  ];

  it("adds the flat delivery fee for delivery", () => {
    expect(computeTotals(lines, "delivery", 150)).toEqual({ subtotal: 2200, deliveryFee: 150, total: 2350 });
  });

  it("never charges delivery for pickup", () => {
    expect(computeTotals(lines, "pickup", 150)).toEqual({ subtotal: 2200, deliveryFee: 0, total: 2200 });
  });

  it("treats a fee of 0 as free delivery", () => {
    expect(computeTotals(lines, "delivery", 0).deliveryFee).toBe(0);
  });

  it("only allows on-sale products", () => {
    expect(canOrder("on_sale")).toBe(true);
    expect(canOrder("out_of_stock")).toBe(false);
    expect(canOrder("coming_soon")).toBe(false);
    expect(canOrder("hidden")).toBe(false);
  });

  it("formats order numbers", () => {
    expect(formatOrderNo(1043)).toBe("FF-1043");
  });
});

describe("phone numbers", () => {
  it("normalises common Kenyan formats", () => {
    for (const input of ["0712345678", "712345678", "254712345678", "+254 712 345 678", "0712-345-678"]) {
      expect(normalizeKenyanPhone(input)).toBe("+254712345678");
    }
    expect(normalizeKenyanPhone("0112345678")).toBe("+254112345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeKenyanPhone("12345")).toBeNull();
    expect(normalizeKenyanPhone("0812345678")).toBeNull();
  });

  it("formats for Daraja and masks for display", () => {
    expect(toDarajaMsisdn("0712345678")).toBe("254712345678");
    expect(maskPhone("0712345678")).toBe("+254 712 ••• 678");
  });
});

import { formatLocalPhone } from "./phone";
import { addDays, dayKey, formatDayKey, formatWhen, startOfDay } from "./dates";
import { nextStatus, paymentText } from "./status";

describe("formatLocalPhone", () => {
  it("shows numbers the way the design does", () => {
    expect(formatLocalPhone("+254712345678")).toBe("0712 345 678");
  });
});

describe("Nairobi dates", () => {
  it("buckets by Kenya day, not UTC day", () => {
    // 22:30 UTC on 23 Oct is 01:30 on 24 Oct in Nairobi.
    expect(dayKey(new Date("2026-10-23T22:30:00Z"))).toBe("2026-10-24");
    expect(startOfDay("2026-10-24").toISOString()).toBe("2026-10-23T21:00:00.000Z");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(formatDayKey("2026-10-24")).toBe("24 Oct 2026");
  });

  it("says Today and Yesterday", () => {
    const now = new Date("2026-10-24T09:00:00Z");
    expect(formatWhen(new Date("2026-10-24T07:12:00Z"), now)).toBe("Today, 10:12");
    expect(formatWhen(new Date("2026-10-23T14:30:00Z"), now)).toBe("Yesterday, 17:30");
    expect(formatWhen(new Date("2026-10-18T11:05:00Z"), now)).toBe("Sun 18 Oct, 14:05");
  });
});

describe("order status helpers", () => {
  it("picks the next step by fulfilment", () => {
    expect(nextStatus("preparing", "delivery")).toBe("out_for_delivery");
    expect(nextStatus("preparing", "pickup")).toBe("ready");
    expect(nextStatus("completed", "pickup")).toBeNull();
  });

  it("describes payment like the design", () => {
    expect(paymentText({ paymentMethod: "mpesa", paymentStatus: "paid", status: "preparing", fulfilment: "delivery", mpesaReceipt: "TJK8H2LQ4P" }).text).toBe("M-Pesa paid · TJK8H2LQ4P");
    expect(paymentText({ paymentMethod: "cod", paymentStatus: "cod", status: "completed", fulfilment: "pickup" }).text).toBe("Paid at pickup");
    expect(paymentText({ paymentMethod: "cod", paymentStatus: "cod", status: "cancelled", fulfilment: "delivery" }).text).toBe("Not charged");
  });
});

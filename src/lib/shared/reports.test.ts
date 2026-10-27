import { describe, expect, it } from "vitest";
import { buildSalesReport, percentages, salesCsv, type CsvOrder } from "./reports";

const order = (o: Partial<CsvOrder> & Pick<CsvOrder, "items">): CsvOrder => ({
  createdAt: new Date("2026-10-23T08:00:00Z"),
  fulfilment: "delivery",
  paymentMethod: "mpesa",
  deliveryFee: 150,
  orderNo: 1001,
  customerName: "Wanjiru",
  customerPhone: "+254712345678",
  deliveryAddressText: "Kandisi Road",
  pickupPointName: null,
  lat: null,
  lng: null,
  paymentStatus: "paid",
  status: "completed",
  ...o,
});

const juice = { productName: "Green Glow", productType: "drink" as const, categoryName: "Drinks", optionLabel: "Pack of 7 bottles, 70 ml each", bottlesCount: 7, quantity: 1, unitPrice: 1500, lineTotal: 1500 };
const cake = { productName: "Carrot Cake", productType: "other" as const, categoryName: "Cakes", optionLabel: "1 kg cake", bottlesCount: null, quantity: 1, unitPrice: 2200, lineTotal: 2200 };

const orders = [
  order({ items: [juice, cake] }),
  order({ orderNo: 1002, fulfilment: "pickup", paymentMethod: "cod", deliveryFee: 0, createdAt: new Date("2026-10-24T08:00:00Z"), items: [{ ...juice, bottlesCount: 1, optionLabel: "Single bottle, 500 ml", unitPrice: 400, quantity: 2, lineTotal: 800 }] }),
];

describe("buildSalesReport", () => {
  it("totals all products, with delivery fees separate", () => {
    const r = buildSalesReport(orders, null, "2026-10-22", "2026-10-24");
    expect(r.revenue).toBe(4500);
    expect(r.orders).toBe(2);
    expect(r.bottles).toBe(9); // a 7-pack counts 7 bottles, plus 2 singles
    expect(r.otherUnits).toBe(1);
    expect(r.deliveryFees).toBe(150);
    expect(r.averageOrder).toBe(2250);
    expect(r.payment).toEqual({ mpesa: 1, delivery: 0, pickup: 1 });
    expect(r.days.map((d) => d.revenue)).toEqual([0, 3700, 800]);
    expect(r.top[0]).toMatchObject({ name: "Green Glow", units: 3, revenue: 2300 });
  });

  it("filters to a category: product sales only, matching orders only", () => {
    const r = buildSalesReport(orders, "Cakes", "2026-10-22", "2026-10-24");
    expect(r.revenue).toBe(2200);
    expect(r.orders).toBe(1);
    expect(r.bottles).toBe(0);
  });
});

describe("percentages", () => {
  it("rounds to a total of 100", () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percentages([0, 0])).toEqual([0, 0]);
  });
});

describe("salesCsv", () => {
  it("writes one row per line and respects the category", () => {
    const csv = salesCsv(orders, "Drinks").trim().split("\r\n");
    expect(csv).toHaveLength(3);
    expect(csv[1]).toContain("FF-1001,2026-10-23,Wanjiru,0712 345 678,");
    expect(csv[2]).toContain("Pay at pickup");
  });

  it("escapes quotes and neutralises formulas", () => {
    const csv = salesCsv([order({ customerName: '=HYPERLINK("x")', items: [cake] })], null);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

import { z } from "zod";
import { normalizeKenyanPhone } from "./phone";

export const cartLineSchema = z.object({
  optionId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

export const quoteRequestSchema = z.object({
  lines: z.array(cartLineSchema).max(30),
});

export const placeOrderSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name.").max(80),
    phone: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const n = normalizeKenyanPhone(v);
        if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a Kenyan mobile number, e.g. 0712 345 678." });
        return n ?? v;
      }),
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.string().email("Check your email address.").optional()),
    fulfilment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(500).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    pickupPointId: z.string().uuid().optional(),
    paymentMethod: z.enum(["mpesa", "cod"]),
    lines: z.array(cartLineSchema).min(1, "Your cart is empty.").max(30),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "delivery") {
      const hasPin = v.lat !== undefined && v.lng !== undefined;
      if (!v.address && !hasPin) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Tell us where to deliver, or share your location." });
      }
    } else if (!v.pickupPointId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupPointId"], message: "Choose a pickup point." });
    }
  });

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

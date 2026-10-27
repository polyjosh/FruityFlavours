import { z } from "zod";
import { normalizeKenyanPhone } from "./phone";

export const phoneField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeKenyanPhone(v);
    if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a Kenyan mobile number, e.g. 712 345 678." });
    return n ?? v;
  });

export const passwordField = z.string().min(8, "At least 8 characters.").max(128);

export const loginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, "Enter your password.").max(128),
  remember: z.boolean().default(true),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  phone: phoneField,
  password: passwordField,
});

export const forgotSchema = z.object({ phone: phoneField });

export const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  newPassword: passwordField.optional(),
});

export const addressSchema = z
  .object({
    line1: z.string().trim().max(300).default(""),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
  })
  .refine((a) => a.line1 || (a.lat !== null && a.lng !== null), { message: "Enter an address or share your location.", path: ["line1"] });

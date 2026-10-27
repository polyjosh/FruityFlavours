import { z } from "zod";
import { normalizeKenyanPhone } from "./phone";

const handleOrLink = z.string().trim().max(200);

export const settingsSchema = z.object({
  deliveryFee: z.number().int("Whole shillings only.").min(0, "Can't be negative.").max(100_000),
  socialLinks: z.object({
    instagram: handleOrLink,
    facebook: handleOrLink,
    tiktok: handleOrLink,
    x: handleOrLink,
    // YouTube handles are ambiguous (channel vs @handle), so the design asks for the full link.
    youtube: handleOrLink.refine((v) => !v || /(^|\/\/|\.)(youtube\.com|youtu\.be)\//i.test(v), "Paste the full link, starting with youtube.com/"),
    whatsapp: z
      .string()
      .trim()
      .max(20)
      .transform((v, ctx) => {
        if (!v) return "";
        const n = normalizeKenyanPhone(v);
        if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a Kenyan mobile number, e.g. 712 000 111." });
        return n ?? v;
      }),
  }),
  removePickupPointIds: z.array(z.string().uuid()).max(50).default([]),
  addPickupPoints: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export type SettingsInput = z.input<typeof settingsSchema>;

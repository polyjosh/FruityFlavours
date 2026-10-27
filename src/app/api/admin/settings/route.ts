import { NextResponse } from "next/server";
import { adminRoute, parseJson } from "@/lib/server/http";
import { saveSettings } from "@/lib/server/settings";
import { settingsSchema } from "@/lib/shared/settings-schema";

export const PUT = adminRoute(async (req: Request) => {
  const { data, error } = await parseJson(req, settingsSchema);
  if (error) return error;
  await saveSettings(data);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";
import { saveDefaultAddress } from "@/lib/server/orders";
import { addressSchema } from "@/lib/shared/auth-schema";

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const { data, error } = await parseJson(req, addressSchema);
  if (error) return error;
  await saveDefaultAddress(user.id, { line1: data.line1 || "Shared location", lat: data.lat, lng: data.lng });
  return NextResponse.json({ ok: true });
}

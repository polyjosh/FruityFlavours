import { NextResponse } from "next/server";
import { z } from "zod";
import { adminLogin } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";

export async function POST(req: Request) {
  const { data, error } = await parseJson(req, z.object({ password: z.string().min(1, "Enter the admin password.").max(200) }));
  if (error) return error;
  const result = await adminLogin(data.password);
  if (!result.ok) return NextResponse.json({ error: result.error, locked: result.locked ?? false }, { status: result.locked ? 429 : 400 });
  return NextResponse.json({ next: "/admin" });
}

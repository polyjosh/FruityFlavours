import { NextResponse } from "next/server";
import { adminLogout } from "@/lib/server/auth";

export async function POST() {
  await adminLogout();
  return NextResponse.json({ next: "/admin/login" });
}

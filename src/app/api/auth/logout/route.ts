import { NextResponse } from "next/server";
import { endCustomerSession } from "@/lib/server/auth";

export async function POST() {
  await endCustomerSession();
  return NextResponse.json({ next: "/account" });
}

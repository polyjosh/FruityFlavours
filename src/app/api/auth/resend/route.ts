import { NextResponse } from "next/server";
import { getPending, sendOtp, testCodeFor } from "@/lib/server/auth";

export async function POST() {
  const pending = await getPending();
  if (!pending) return NextResponse.json({ error: "Your code request expired. Start again." }, { status: 400 });
  const sent = await sendOtp(pending.phone, pending.purpose);
  if (!sent.ok) return NextResponse.json({ error: sent.error, resendIn: sent.resendIn ?? null }, { status: 429 });
  return NextResponse.json({ resendIn: sent.resendIn, testCode: testCodeFor(pending.phone) });
}

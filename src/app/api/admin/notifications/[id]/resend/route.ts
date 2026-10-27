import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/http";
import { resendSms } from "@/lib/server/sms";

export const POST = adminRoute(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const row = await resendSms((await params).id);
    return NextResponse.json({ status: row.status, error: row.error });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t resend." }, { status: 400 });
  }
});

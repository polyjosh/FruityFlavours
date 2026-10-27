import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { sendOtp, setPending } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";
import { forgotSchema } from "@/lib/shared/auth-schema";

export async function POST(req: Request) {
  const { data, error } = await parseJson(req, forgotSchema);
  if (error) return error;
  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user || !user.isActive) {
    return NextResponse.json({ fieldErrors: { phone: "No account uses this number yet. Create one?" } }, { status: 400 });
  }
  const sent = await sendOtp(data.phone, "reset");
  await setPending(data.phone, "reset");
  return NextResponse.json({ next: "/account/verify", notice: sent.ok ? null : sent.error });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { hashPassword, sendOtp, setPending } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";
import { signupSchema } from "@/lib/shared/auth-schema";

export async function POST(req: Request) {
  const { data, error } = await parseJson(req, signupSchema);
  if (error) return error;
  const prisma = await db();
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing?.phoneVerifiedAt) {
    return NextResponse.json({ fieldErrors: { phone: "There’s already an account for this number. Log in instead." } }, { status: 400 });
  }
  const passwordHash = await hashPassword(data.password);
  if (existing) await prisma.user.update({ where: { id: existing.id }, data: { name: data.name, passwordHash } });
  else await prisma.user.create({ data: { name: data.name, phone: data.phone, passwordHash } });

  const sent = await sendOtp(data.phone, "verify");
  await setPending(data.phone, "verify");
  // When sending is throttled, a recent code is still valid, so go on to the code screen either way.
  return NextResponse.json({ next: "/account/verify", notice: sent.ok ? null : sent.error });
}

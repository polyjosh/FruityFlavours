import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { checkOtp, clearPending, getPending, hashPassword, linkGuestOrders, startCustomerSession } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";
import { verifySchema } from "@/lib/shared/auth-schema";

export async function POST(req: Request) {
  const { data, error } = await parseJson(req, verifySchema);
  if (error) return error;
  const pending = await getPending();
  if (!pending) return NextResponse.json({ error: "Your code request expired. Start again." }, { status: 400 });
  if (pending.purpose === "reset" && !data.newPassword) {
    return NextResponse.json({ fieldErrors: { newPassword: "Choose a new password." } }, { status: 400 });
  }

  const check = await checkOtp(pending.phone, pending.purpose, data.code);
  if (!check.ok) return NextResponse.json({ fieldErrors: { code: check.error } }, { status: 400 });

  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { phone: pending.phone } });
  if (!user) return NextResponse.json({ error: "Account not found. Start again." }, { status: 400 });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
      ...(data.newPassword ? { passwordHash: await hashPassword(data.newPassword) } : {}),
    },
  });
  await linkGuestOrders(user.id, user.phone);
  await clearPending();
  await startCustomerSession(user.id, pending.remember);
  return NextResponse.json({ next: "/account" });
}

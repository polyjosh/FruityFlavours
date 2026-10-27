import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { checkPassword, sendOtp, setPending, startCustomerSession } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/http";
import { loginSchema } from "@/lib/shared/auth-schema";

export async function POST(req: Request) {
  const { data, error } = await parseJson(req, loginSchema);
  if (error) return error;
  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user || !user.isActive || !user.passwordHash) {
    return NextResponse.json({ fieldErrors: { phone: "No account uses this number yet. Create one?" } }, { status: 400 });
  }
  if (!(await checkPassword(user.passwordHash, data.password))) {
    return NextResponse.json({ fieldErrors: { password: "That password doesn’t match. Try again or reset it." } }, { status: 400 });
  }
  if (!user.phoneVerifiedAt) {
    // Signed up but never entered the code: send a fresh one.
    await sendOtp(user.phone, "verify");
    await setPending(user.phone, "verify", data.remember);
    return NextResponse.json({ next: "/account/verify" });
  }
  await startCustomerSession(user.id, data.remember);
  return NextResponse.json({ next: "/account" });
}

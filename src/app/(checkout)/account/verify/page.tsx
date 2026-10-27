import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPending, OTP_RESEND_SECONDS, testCodeFor } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { formatLocalPhone } from "@/lib/shared/phone";
import { VerifyForm } from "@/components/account/VerifyForm";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Enter your code · FruityFlavours" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const pending = await getPending();
  if (!pending) redirect("/account");

  const prisma = await db();
  const last = await prisma.otpCode.findFirst({ where: { phone: pending.phone }, orderBy: { createdAt: "desc" } });
  const elapsed = last ? Math.floor((Date.now() - last.createdAt.getTime()) / 1000) : OTP_RESEND_SECONDS;

  return (
    <>
      <header className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <Link className="btn btn-ghost btn-sm" href={pending.purpose === "reset" ? "/account?mode=forgot" : "/account?mode=signup"} style={{ padding: "0 8px" }}>
          <ArrowLeftIcon size={18} />
          Back
        </Link>
      </header>
      <VerifyForm phoneLabel={formatLocalPhone(pending.phone)} purpose={pending.purpose} testCode={testCodeFor(pending.phone)} resendIn={Math.max(0, OTP_RESEND_SECONDS - elapsed)} />
    </>
  );
}

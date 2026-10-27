import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import { sendSms, smsConfigured } from "./sms";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, PENDING_COOKIE, signToken, verifyToken } from "./session";
import { OTP_LOG_BODY, otpSms } from "@/lib/shared/sms-templates";

const DAY = 24 * 60 * 60;
const secure = process.env.NODE_ENV === "production";

// ---------- passwords ----------

export const hashPassword = (password: string) => hash(password);
export async function checkPassword(stored: string | null | undefined, password: string) {
  if (!stored) return false;
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

// ---------- customer sessions ----------

/** "Keep me logged in" = 30-day cookie; otherwise a browser-session cookie with a 12-hour token. */
export async function startCustomerSession(userId: string, remember: boolean) {
  const maxAge = remember ? 30 * DAY : DAY / 2;
  const token = await signToken("customer", { sub: userId }, maxAge);
  (await cookies()).set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", ...(remember ? { maxAge } : {}) });
}

export async function endCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function currentUser() {
  const payload = await verifyToken((await cookies()).get(CUSTOMER_COOKIE)?.value, "customer");
  if (!payload?.sub) return null;
  const prisma = await db();
  const user = await prisma.user.findUnique({
    where: { id: String(payload.sub) },
    include: { addresses: { where: { isDefault: true }, take: 1 } },
  });
  return user?.isActive && user.phoneVerifiedAt ? user : null;
}

// ---------- pending verification (sign-up / reset) ----------

export type PendingPurpose = "verify" | "reset";

export async function setPending(phone: string, purpose: PendingPurpose, remember = true) {
  const token = await signToken("pending", { phone, purpose, remember: remember ? "1" : "0" }, 30 * 60);
  (await cookies()).set(PENDING_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 30 * 60 });
}

export async function getPending() {
  const p = await verifyToken((await cookies()).get(PENDING_COOKIE)?.value, "pending");
  if (!p?.phone) return null;
  return { phone: String(p.phone), purpose: (p.purpose === "reset" ? "reset" : "verify") as PendingPurpose, remember: p.remember !== "0" };
}

export async function clearPending() {
  (await cookies()).delete(PENDING_COOKIE);
}

// ---------- one-time codes ----------

const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_SECONDS = 30;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

/**
 * Test mode: on a dev machine with no SMS provider, the latest code per phone is kept in memory
 * so the code screen can show it. Never active in production or once SMS keys are set.
 */
export const otpTestMode = () => process.env.NODE_ENV !== "production" && !smsConfigured();
const testCodes = ((globalThis as unknown as { __ffTestCodes?: Map<string, string> }).__ffTestCodes ??= new Map());
export const testCodeFor = (phone: string) => (otpTestMode() ? (testCodes.get(phone) ?? null) : null);

function codeHash(phone: string, code: string) {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(`${phone}:${code}`).digest("hex");
}

export type OtpSendResult = { ok: true; resendIn: number } | { ok: false; error: string; resendIn?: number };

export async function sendOtp(phone: string, purpose: PendingPurpose): Promise<OtpSendResult> {
  const prisma = await db();
  const recent = await prisma.otpCode.findMany({
    where: { phone, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent[0]) {
    const wait = OTP_RESEND_SECONDS - Math.floor((Date.now() - recent[0].createdAt.getTime()) / 1000);
    if (wait > 0) return { ok: false, error: `You can resend in 0:${String(wait).padStart(2, "0")}.`, resendIn: wait };
  }
  if (recent.length >= OTP_MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Please try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({ data: { phone, purpose, codeHash: codeHash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  if (otpTestMode()) testCodes.set(phone, code);
  await sendSms({ to: phone, body: otpSms(code), logBody: OTP_LOG_BODY, template: "otp" });
  return { ok: true, resendIn: OTP_RESEND_SECONDS };
}

export async function checkOtp(phone: string, purpose: PendingPurpose, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = await db();
  const otp = await prisma.otpCode.findFirst({ where: { phone, purpose, usedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt < new Date()) return { ok: false, error: "That code has expired. Ask for a new one." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many wrong tries. Ask for a new code." };
  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(codeHash(phone, code), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "That code isn't right. Check the SMS and try again." };
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  testCodes.delete(phone);
  return { ok: true };
}

/** After a phone is verified: link the guest orders placed with that number. */
export async function linkGuestOrders(userId: string, phone: string) {
  const prisma = await db();
  await prisma.order.updateMany({ where: { customerPhone: phone, userId: null }, data: { userId } });
  await prisma.notification.updateMany({ where: { recipient: phone, userId: null }, data: { userId } });
}

// ---------- admin ----------

const ADMIN_MAX_TRIES = 5;
const ADMIN_PAUSE_MS = 5 * 60 * 1000;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** ADMIN_PASSWORD_HASH is base64 of the argon2 hash (base64 so "$" isn't expanded by .env loading). */
function adminHash() {
  const b64 = process.env.ADMIN_PASSWORD_HASH;
  return b64 ? Buffer.from(b64, "base64").toString("utf8") : null;
}

export type AdminLoginResult = { ok: true } | { ok: false; error: string; locked?: boolean };

export async function adminLogin(password: string): Promise<AdminLoginResult> {
  const stored = adminHash();
  if (!stored) return { ok: false, error: "Admin sign-in isn't set up yet. Run npm run admin:password on the server." };
  const prisma = await db();
  const ip = await clientIp();
  const since = new Date(Date.now() - ADMIN_PAUSE_MS);
  const failures = await prisma.adminLoginAttempt.count({ where: { ip, createdAt: { gte: since } } });
  if (failures >= ADMIN_MAX_TRIES) return { ok: false, locked: true, error: "Too many wrong tries. Please wait 5 minutes and try again." };

  if (!(await checkPassword(stored, password))) {
    await prisma.adminLoginAttempt.create({ data: { ip } });
    const left = ADMIN_MAX_TRIES - failures - 1;
    if (left <= 0) return { ok: false, locked: true, error: "Too many wrong tries. Please wait 5 minutes and try again." };
    return { ok: false, error: `Wrong password. ${left} ${left === 1 ? "try" : "tries"} left before a 5-minute pause.` };
  }

  await prisma.adminLoginAttempt.deleteMany({ where: { ip } });
  const token = await signToken("admin", { sub: "admin" }, DAY / 2);
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: DAY / 2 });
  return { ok: true };
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  return (await verifyToken((await cookies()).get(ADMIN_COOKIE)?.value, "admin")) !== null;
}

export class UnauthorizedError extends Error {}

/** Call at the top of every admin route handler (middleware also guards /admin pages). */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new UnauthorizedError("Admin sign-in required");
}

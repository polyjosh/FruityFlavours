// Signed session tokens. No "server-only" import: middleware (edge runtime) uses verifyToken too.
import { jwtVerify, SignJWT } from "jose";

export const CUSTOMER_COOKIE = "ff_session";
export const ADMIN_COOKIE = "ff_admin";
export const PENDING_COOKIE = "ff_pending";

export type TokenKind = "customer" | "admin" | "pending";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (at least 32 characters)");
  return new TextEncoder().encode(s);
}

export async function signToken(kind: TokenKind, payload: Record<string, string>, maxAgeSeconds: number) {
  return new SignJWT({ ...payload, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret());
}

export async function verifyToken(token: string | undefined, kind: TokenKind): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.kind === kind ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

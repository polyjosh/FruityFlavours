import "server-only";
import { NextResponse } from "next/server";
import type { z, ZodError, ZodTypeAny } from "zod";
import { requireAdmin, UnauthorizedError } from "./auth";

/** First message per field, for showing next to inputs. */
export function fieldErrors(error: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (parsed.success) return { data: parsed.data as z.output<S>, error: null };
  return {
    data: null,
    error: NextResponse.json({ error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 }),
  };
}

/** Wraps an admin route handler: 401 without the admin session. */
export function adminRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await requireAdmin();
      return await handler(...args);
    } catch (e) {
      if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
      throw e;
    }
  };
}

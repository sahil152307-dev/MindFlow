import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * MindFlow session — a lightweight, cookie-backed session that plays the
 * role of Firebase Auth in this build. The cookie holds the user id and is
 * httpOnly; API routes resolve the current user from it (with a body/query
 * fallback for resilience in the sandbox preview).
 */
export const SESSION_COOKIE = "mindflow_session";

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days — planner users come and go gently
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUserId(
  fallback?: string | null
): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? fallback ?? null;
}

/** Resolve the full user row for a request, or null. */
export async function getCurrentUser(fallbackId?: string | null) {
  const userId = await getSessionUserId(fallbackId);
  if (!userId) return null;
  try {
    return await db.user.findUnique({ where: { id: userId } });
  } catch {
    return null;
  }
}

/* ——— date helpers (day-normalized, local-agnostic) ——— */

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  const da = startOfDay(a).getTime();
  const dbb = startOfDay(b).getTime();
  return Math.round((dbb - da) / 86_400_000);
}

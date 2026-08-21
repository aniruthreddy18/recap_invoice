import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetting, setSetting } from "./db";

/**
 * Whole-app PIN gate. The PIN is chosen on first launch, not pre-assigned.
 *
 * The session is a random token stored beside the PIN hash in the database
 * rather than an HMAC of an environment secret, so there is one less thing to
 * configure when deploying.
 */

export const SESSION_COOKIE = "rr_auth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — a tool used daily

const PIN_SALT = "recapreels-pin:";

// A public URL means anyone can reach the keypad, so guessing has to be slow.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export function hashPin(pin: string): string {
  return createHash("sha256").update(PIN_SALT + pin).digest("hex");
}

/** Constant-time compare, so a wrong PIN can't be found by timing the reply. */
function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** The token every signed-in device presents; created once, on first login. */
async function sessionToken(): Promise<string> {
  const existing = await getSetting("session_token");
  if (existing) return existing;
  const token = randomBytes(32).toString("hex");
  await setSetting("session_token", token);
  return token;
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const stored = await getSetting("session_token");
  return Boolean(stored) && sameHash(token, stored!);
}

/**
 * Gate for server components. Every screen renders inside app/(app)/layout.tsx,
 * and the two PDF routes call isSignedIn() themselves.
 */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}

/* ------------------------------------------------------------- rate limit */

/**
 * Failed attempts are counted in the database rather than in memory: on a
 * serverless host each request may run in a different instance, so an
 * in-process counter would reset constantly and protect nothing.
 */
export async function lockoutRemainingMs(): Promise<number> {
  const until = Number((await getSetting("lockout_until")) ?? 0);
  return Math.max(0, until - Date.now());
}

export async function recordFailedAttempt(): Promise<number> {
  const failures = Number((await getSetting("failed_attempts")) ?? 0) + 1;
  await setSetting("failed_attempts", String(failures));
  if (failures >= MAX_ATTEMPTS) {
    await setSetting("lockout_until", String(Date.now() + LOCKOUT_MS));
    await setSetting("failed_attempts", "0");
    return 0;
  }
  return MAX_ATTEMPTS - failures;
}

export async function clearFailedAttempts(): Promise<void> {
  await setSetting("failed_attempts", "0");
  await setSetting("lockout_until", "0");
}

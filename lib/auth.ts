import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetting, setSetting } from "./db";

/**
 * Whole-app PIN gate. The PIN is chosen on first launch, not pre-assigned.
 *
 * The session is a random token stored next to the PIN hash in the database
 * file rather than an HMAC of an environment secret — this app carries its own
 * storage, so there is nothing to configure before it runs.
 */

export const SESSION_COOKIE = "rr_auth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — a tool used daily

const PIN_SALT = "recapreels-pin:";

export function hashPin(pin: string): string {
  return createHash("sha256").update(PIN_SALT + pin).digest("hex");
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
  return Boolean(stored) && token === stored;
}

/**
 * Gate for server components. Every page under app/(app) goes through the
 * group layout, and the two PDF routes call this too — there is no middleware
 * doing it centrally any more, because middleware can't reach the database.
 */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}

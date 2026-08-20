// Whole-app PIN gate, same shape as the borewell app: the PIN is chosen on
// first launch (not pre-assigned) and its hash lives in Postgres, because
// middleware has to check something before rendering any server page.
//
// The session cookie is signed with SESSION_SECRET rather than derived from
// the PIN, so changing the PIN later doesn't invalidate the session logic.
const SESSION_COOKIE = "rr_auth";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return bufferToHex(digest);
}

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`recapreels-pin:${pin}`);
}

export async function sessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("recapreels-session"));
  return bufferToHex(sig);
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  return cookieValue === (await sessionToken());
}

export { SESSION_COOKIE, SESSION_MAX_AGE };

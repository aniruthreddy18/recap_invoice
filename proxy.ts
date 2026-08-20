import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

// Next 16 renamed the "middleware" file convention to "proxy"; same runtime,
// same matcher semantics.

export default async function proxy(req: NextRequest) {
  // Without a database there is nothing to log in against — send the user to
  // the setup page instead of letting the driver fail on localhost:5432.
  if (!process.env.DATABASE_URL) {
    if (req.nextUrl.pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && token === (await sessionToken())) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login screen, Next's own assets, and files served
  // straight out of public/ — the image optimizer fetches those over HTTP, and
  // a redirect to /login makes it report "not a valid image".
  matcher: ["/((?!login|setup|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};

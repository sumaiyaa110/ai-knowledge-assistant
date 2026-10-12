import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_PAGES,
  DEFAULT_SIGNED_IN_PATH,
  PROTECTED_PREFIXES,
  PUBLIC_API_ROUTES,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

// First line of defence: runs before every matched request and checks the
// JWT's signature and expiry. It cannot reach the database (edge runtime), so
// pages and API routes still call getCurrentUser()/requireUser() themselves.
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  let response: NextResponse;

  if (pathname.startsWith("/api/")) {
    response =
      session || matches(pathname, PUBLIC_API_ROUTES)
        ? NextResponse.next()
        : NextResponse.json({ error: "Not signed in" }, { status: 401 });
  } else if (!session && matches(pathname, PROTECTED_PREFIXES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(loginUrl);
  } else if (session && matches(pathname, AUTH_PAGES)) {
    response = NextResponse.redirect(new URL(DEFAULT_SIGNED_IN_PATH, request.url));
  } else {
    response = NextResponse.next();
  }

  // Drop cookies that are expired or tampered with.
  if (token && !session) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

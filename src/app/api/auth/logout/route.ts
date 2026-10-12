import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

// requireUser() redirects here when a cookie is validly signed but no longer
// accepted (user deleted, or password changed elsewhere). Server components
// cannot delete cookies themselves, and leaving the cookie in place would make
// middleware bounce /login back to /dashboard forever.
export async function GET(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}

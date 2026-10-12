import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import type { SessionUser } from "@/models/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";
import { signSessionToken, verifySessionToken, type SessionPayload } from "./jwt";

/** Issue a JWT for the user and store it in the httpOnly session cookie. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // not sent on cross-site POSTs
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Verify the cookie's signature and expiry only. No database access. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/**
 * The signed-in user, or null. Checks the database so that deleted users and
 * sessions issued before a password change are rejected. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
});

/** For server components and pages: redirect to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  // Goes through the logout route so a stale cookie is cleared on the way.
  if (!user) redirect("/api/auth/logout");
  return user;
}

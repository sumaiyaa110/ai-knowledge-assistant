import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { verifyPassword } from "@/lib/auth/password";
import { clearFailures, recordFailure, retryAfterSeconds } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { loginSchema } from "@/models/auth";

export async function POST(request: Request) {
  const { data, response } = await parseBody(request, loginSchema);
  if (response) return response;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const limitKey = `${ip}:${data.email}`;
  const wait = retryAfterSeconds(limitKey);
  if (wait > 0) {
    return jsonError(
      `Too many sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
      429,
      undefined,
      { "Retry-After": String(wait) },
    );
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(data.password, user?.passwordHash);

  if (!user || !valid) {
    recordFailure(limitKey);
    // Same message for "no such account" and "wrong password".
    return jsonError("Invalid email or password", 401);
  }

  clearFailures(limitKey);
  await createSession({ userId: user.id, sessionVersion: user.sessionVersion });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

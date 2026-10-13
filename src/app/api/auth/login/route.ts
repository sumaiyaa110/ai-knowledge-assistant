import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { verifyPassword } from "@/lib/auth/password";
import { clientAddress, limiters, tooManyAttemptsMessage } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { loginSchema } from "@/models/auth";

export async function POST(request: Request) {
  const { data, response } = await parseBody(request, loginSchema);
  if (response) return response;

  const address = clientAddress(request);
  const wait = Math.max(
    limiters.loginByEmail.retryAfterSeconds(data.email),
    limiters.loginByIp.retryAfterSeconds(address),
  );
  if (wait > 0) {
    return jsonError(tooManyAttemptsMessage(wait), 429, undefined, {
      "Retry-After": String(wait),
    });
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(data.password, user?.passwordHash);

  if (!user || !valid) {
    limiters.loginByEmail.record(data.email);
    limiters.loginByIp.record(address);
    // Same message for "no such account" and "wrong password".
    return jsonError("Invalid email or password", 401);
  }

  limiters.loginByEmail.clear(data.email);
  await createSession({ userId: user.id, sessionVersion: user.sessionVersion });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

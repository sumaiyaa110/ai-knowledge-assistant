import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { changePasswordSchema } from "@/models/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, changePasswordSchema);
  if (response) return response;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(data.currentPassword, record?.passwordHash))) {
    const message = "Current password is incorrect";
    return jsonError(message, 400, { currentPassword: [message] });
  }

  // Bumping sessionVersion signs out every other device; this one gets a fresh cookie.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(data.newPassword),
      sessionVersion: { increment: 1 },
    },
    select: { id: true, sessionVersion: true },
  });
  await createSession({ userId: updated.id, sessionVersion: updated.sessionVersion });

  return NextResponse.json({ ok: true });
}

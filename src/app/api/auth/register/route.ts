import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { jsonError, parseBody } from "@/lib/api/respond";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { registerSchema } from "@/models/auth";

const EMAIL_TAKEN = "An account with this email already exists";

export async function POST(request: Request) {
  const { data, response } = await parseBody(request, registerSchema);
  if (response) return response;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) return jsonError(EMAIL_TAKEN, 409, { email: [EMAIL_TAKEN] });

  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: { email: data.email, name: data.name, passwordHash },
      select: { id: true, email: true, name: true, sessionVersion: true },
    });
    await createSession({ userId: user.id, sessionVersion: user.sessionVersion });
    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    // Two simultaneous registrations with the same email: the unique index wins.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(EMAIL_TAKEN, 409, { email: [EMAIL_TAKEN] });
    }
    console.error("Registration failed", error);
    return jsonError("Could not create the account. Please try again.", 500);
  }
}

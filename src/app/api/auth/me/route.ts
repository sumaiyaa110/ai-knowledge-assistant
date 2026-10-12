import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { updateProfileSchema } from "@/models/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, updateProfileSchema);
  if (response) return response;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: data.name },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ user: updated });
}

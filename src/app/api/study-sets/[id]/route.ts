import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteStudySet, getStudySet } from "@/lib/tools/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const studySet = await getStudySet(user.id, (await params).id);
  if (!studySet) return jsonError("Study set not found", 404);
  return NextResponse.json({ studySet });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const deleted = await deleteStudySet(user.id, (await params).id);
  if (!deleted) return jsonError("Study set not found", 404);
  return NextResponse.json({ ok: true });
}

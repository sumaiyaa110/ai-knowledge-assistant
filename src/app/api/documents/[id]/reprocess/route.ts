import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { reprocessDocument } from "@/lib/documents/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const queued = await reprocessDocument(user.id, (await params).id);
  if (!queued) return jsonError("Document not found", 404);
  return NextResponse.json({ ok: true }, { status: 202 });
}

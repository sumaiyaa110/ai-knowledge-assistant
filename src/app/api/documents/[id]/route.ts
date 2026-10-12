import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteDocument, getDocument, toDocumentDTO } from "@/lib/documents/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const document = await getDocument(user.id, (await params).id);
  if (!document) return jsonError("Document not found", 404);
  return NextResponse.json({ document: toDocumentDTO(document) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const deleted = await deleteDocument(user.id, (await params).id);
  if (!deleted) return jsonError("Document not found", 404);
  return NextResponse.json({ ok: true });
}

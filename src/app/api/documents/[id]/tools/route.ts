import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { getDocumentToolsState } from "@/lib/tools/service";

/** Summary, generation progress and saved study sets for a document. Polled by the tools screen. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const state = await getDocumentToolsState(user.id, (await params).id);
  if (!state) return jsonError("Document not found", 404);
  return NextResponse.json(state);
}

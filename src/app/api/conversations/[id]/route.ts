import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteConversation, getConversation, renameConversation } from "@/lib/chat/service";
import { renameConversationSchema } from "@/models/chat";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const conversation = await getConversation(user.id, (await params).id);
  if (!conversation) return jsonError("Conversation not found", 404);
  return NextResponse.json({ conversation });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, renameConversationSchema);
  if (response) return response;

  const renamed = await renameConversation(user.id, (await params).id, data.title);
  if (!renamed) return jsonError("Conversation not found", 404);
  return NextResponse.json({ ok: true, title: data.title });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const deleted = await deleteConversation(user.id, (await params).id);
  if (!deleted) return jsonError("Conversation not found", 404);
  return NextResponse.json({ ok: true });
}

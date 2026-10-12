import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { InvalidScopeError, createConversation, listConversations } from "@/lib/chat/service";
import { createConversationSchema } from "@/models/chat";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  return NextResponse.json({ conversations: await listConversations(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, createConversationSchema);
  if (response) return response;

  try {
    const conversation = await createConversation(user.id, data.documentIds);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidScopeError) return jsonError(error.message, 404);
    throw error;
  }
}

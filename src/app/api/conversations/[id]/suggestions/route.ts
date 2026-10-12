import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getSuggestedQuestions } from "@/lib/ai/suggestions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

/** Starter questions for an empty conversation, based on the documents it covers. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const conversation = await prisma.conversation.findFirst({
    where: { id: (await params).id, userId: user.id },
    select: { allDocuments: true, documents: { select: { documentId: true } } },
  });
  if (!conversation) return jsonError("Conversation not found", 404);

  const documentIds = conversation.allDocuments
    ? undefined
    : conversation.documents.map((link) => link.documentId);
  const questions = await getSuggestedQuestions(user.id, documentIds);
  return NextResponse.json({ questions });
}

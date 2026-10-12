import type { Message } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import type {
  ChatMessageDTO,
  ConversationScope,
  ConversationSummaryDTO,
  MessageSource,
} from "@/models/chat";

/** Thrown when a request names documents the user does not own. */
export class InvalidScopeError extends Error {}

export function toMessageDTO(message: Message): ChatMessageDTO {
  return {
    id: message.id,
    role: message.role === "USER" ? "USER" : "ASSISTANT",
    content: message.content,
    sources: Array.isArray(message.sources) ? (message.sources as unknown as MessageSource[]) : [],
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listConversations(userId: string): Promise<ConversationSummaryDTO[]> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return conversations.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() }));
}

/** Create a chat over all documents, or over the given ones (which must be the user's). */
export async function createConversation(
  userId: string,
  documentIds: string[] = [],
): Promise<ConversationSummaryDTO> {
  const ids = [...new Set(documentIds)];
  if (ids.length > 0) {
    const owned = await prisma.document.count({ where: { userId, id: { in: ids } } });
    if (owned !== ids.length) throw new InvalidScopeError("One of the selected documents was not found.");
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      allDocuments: ids.length === 0,
      documents: { create: ids.map((documentId) => ({ documentId })) },
    },
    select: { id: true, title: true, updatedAt: true },
  });
  return { ...conversation, updatedAt: conversation.updatedAt.toISOString() };
}

export type ConversationDetail = {
  id: string;
  title: string;
  scope: ConversationScope;
  messages: ChatMessageDTO[];
  /** Ids of documents that still exist among those cited by the messages. */
  existingDocumentIds: string[];
};

/** Null when the conversation does not exist or belongs to someone else. */
export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      documents: { select: { document: { select: { id: true, title: true } } } },
    },
  });
  if (!conversation) return null;

  const messages = conversation.messages.map(toMessageDTO);

  // Sources are stored with each message, so they outlive their document.
  // Find out which are still there, so the UI only links to those.
  const citedIds = [...new Set(messages.flatMap((m) => m.sources.map((s) => s.documentId)))];
  const existing = citedIds.length
    ? await prisma.document.findMany({
        where: { userId, id: { in: citedIds } },
        select: { id: true },
      })
    : [];

  return {
    id: conversation.id,
    title: conversation.title,
    scope: {
      allDocuments: conversation.allDocuments,
      documents: conversation.documents.map((link) => link.document),
    },
    messages,
    existingDocumentIds: existing.map((document) => document.id),
  };
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string,
): Promise<boolean> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { updatedAt: true },
  });
  if (!conversation) return false;

  // Keep updatedAt as it was: the list is ordered by last activity, and
  // renaming a chat should not move it to the top.
  await prisma.conversation.updateMany({
    where: { id: conversationId, userId },
    data: { title, updatedAt: conversation.updatedAt },
  });
  return true;
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const { count } = await prisma.conversation.deleteMany({ where: { id: conversationId, userId } });
  return count > 0;
}

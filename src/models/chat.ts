import { z } from "zod";

export const MAX_QUESTION_CHARS = 4000;
export const DEFAULT_CONVERSATION_TITLE = "New chat";

export const createConversationSchema = z.object({
  /** Omit or leave empty to chat with all documents. */
  documentIds: z.array(z.string().min(1)).max(50).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Type a question first")
    .max(MAX_QUESTION_CHARS, `Questions can be at most ${MAX_QUESTION_CHARS} characters`),
});

/** A passage an answer was based on. Stored with the message, so it survives document deletion. */
export type MessageSource = {
  /** The number used in the prompt and in the answer's [n] citations. */
  number: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  similarity: number;
  excerpt: string;
  /** Whether the answer actually cited this source. */
  cited: boolean;
};

export type ChatMessageDTO = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources: MessageSource[];
  createdAt: string;
};

export type ConversationSummaryDTO = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ConversationScope = {
  allDocuments: boolean;
  /** Documents this chat is limited to that still exist. */
  documents: { id: string; title: string }[];
};

export type ChatErrorCode =
  | "ollama_unavailable"
  | "model_missing"
  | "timeout"
  | "embedding_failed"
  | "failed";

/** One line of the streamed reply from POST /api/conversations/:id/messages. */
export type ChatStreamEvent =
  | { type: "status"; stage: "searching" | "generating" }
  | { type: "user_message"; message: ChatMessageDTO }
  | { type: "sources"; sources: MessageSource[] }
  | { type: "token"; text: string }
  | { type: "done"; message: ChatMessageDTO; title: string }
  | { type: "error"; code: ChatErrorCode; error: string };

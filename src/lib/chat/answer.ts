import { OllamaError, streamChat, type ChatMessage } from "@/lib/ai/ollama";
import { DOCUMENTS_GONE_ANSWER, NOT_FOUND_ANSWER, buildChatMessages } from "@/lib/ai/prompts";
import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import { EmbeddingError } from "@/lib/embeddings/embed";
import { estimateTokens } from "@/lib/rag/chunk";
import { getRelevantContext } from "@/lib/rag/retrieve";
import {
  DEFAULT_CONVERSATION_TITLE,
  type ChatErrorCode,
  type ChatStreamEvent,
  type MessageSource,
} from "@/models/chat";
import type { RelevantContext } from "@/models/retrieval";
import { toMessageDTO } from "./service";

const HISTORY_MESSAGES_LOADED = 12;
const MAX_HISTORY_MESSAGE_CHARS = 1200;
const EXCERPT_CHARS = 280;
const TITLE_CHARS = 60;

type AnswerInput = {
  userId: string;
  conversationId: string;
  question: string;
  /** Aborted when the browser disconnects or the user presses Stop. */
  signal: AbortSignal;
};

const ERROR_CODES: Record<string, ChatErrorCode> = {
  unavailable: "ollama_unavailable",
  model_missing: "model_missing",
  timeout: "timeout",
};

/** Newest turns that fit the history budget, oldest first, starting with a user turn. */
function fitHistory(messages: { role: string; content: string }[]): ChatMessage[] {
  const history: ChatMessage[] = [];
  let tokens = 0;

  for (const message of [...messages].reverse()) {
    const content = message.content.slice(0, MAX_HISTORY_MESSAGE_CHARS);
    tokens += estimateTokens(content);
    if (tokens > config.rag.maxHistoryTokens) break;
    history.unshift({ role: message.role === "USER" ? "user" : "assistant", content });
  }
  while (history.length > 0 && history[0].role !== "user") history.shift();
  return history;
}

function toSources(context: RelevantContext): MessageSource[] {
  return context.chunks.map((chunk, i) => ({
    number: i + 1,
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    pageNumber: chunk.pageNumber,
    similarity: Number(chunk.similarity.toFixed(4)),
    excerpt:
      chunk.content.length > EXCERPT_CHARS
        ? `${chunk.content.slice(0, EXCERPT_CHARS).trimEnd()}…`
        : chunk.content,
    cited: false,
  }));
}

/** Mark which sources the answer cited. A refusal keeps no sources at all. */
function resolveCitations(answer: string, sources: MessageSource[]): MessageSource[] {
  // Accepts single citations "[1]" and grouped ones such as "[1,2]" or "[1, 3]".
  const cited = new Set(
    [...answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((match) =>
      match[1].split(",").map((number) => Number(number.trim())),
    ),
  );
  const refused = answer.toLowerCase().includes(NOT_FOUND_ANSWER.toLowerCase().replace(/\.$/, ""));
  if (refused && cited.size === 0) return [];
  return sources.map((source) => ({ ...source, cited: cited.has(source.number) }));
}

function makeTitle(question: string): string {
  const oneLine = question.replace(/\s+/g, " ").trim();
  return oneLine.length > TITLE_CHARS ? `${oneLine.slice(0, TITLE_CHARS).trimEnd()}…` : oneLine;
}

/**
 * Answer one question in a conversation, as a stream of events:
 *
 *   save question -> embed + search pgvector -> build prompt -> stream from
 *   Ollama -> save answer and sources
 *
 * Never throws: every failure is reported as an `error` event.
 */
export async function* answerQuestion({
  userId,
  conversationId,
  question,
  signal,
}: AnswerInput): AsyncGenerator<ChatStreamEvent> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      title: true,
      allDocuments: true,
      documents: { select: { documentId: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: HISTORY_MESSAGES_LOADED,
        select: { role: true, content: true },
      },
    },
  });
  if (!conversation) {
    yield { type: "error", code: "failed", error: "Conversation not found." };
    return;
  }
  const previousMessages = conversation.messages.reverse();

  const userMessage = await prisma.message.create({
    data: { conversationId, role: "USER", content: question },
  });
  yield { type: "user_message", message: toMessageDTO(userMessage) };

  // Finish the turn: store the answer, bump the conversation, name it after
  // its first question.
  const saveAnswer = async (content: string, sources: MessageSource[]) => {
    const title =
      conversation.title === DEFAULT_CONVERSATION_TITLE ? makeTitle(question) : conversation.title;
    const [assistantMessage] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, role: "ASSISTANT", content, sources },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { title, updatedAt: new Date() },
      }),
    ]);
    return { type: "done", message: toMessageDTO(assistantMessage), title } as const;
  };
  // A question that got no answer is removed again, so retrying does not
  // leave it in the history twice.
  const abandon = async (code: ChatErrorCode, error: string) => {
    await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {});
    return { type: "error", code, error } as const;
  };

  // --- Retrieve -------------------------------------------------------------
  yield { type: "status", stage: "searching" };

  const documentIds = conversation.allDocuments
    ? undefined
    : conversation.documents.map((link) => link.documentId);
  if (documentIds && documentIds.length === 0) {
    yield { type: "token", text: DOCUMENTS_GONE_ANSWER };
    yield await saveAnswer(DOCUMENTS_GONE_ANSWER, []);
    return;
  }

  let context: RelevantContext;
  try {
    context = await getRelevantContext({ userId, query: question, documentIds });

    // A follow-up such as "why is that?" means little on its own. If it
    // matched nothing, search again together with the previous question.
    const previousQuestion = previousMessages.findLast((m) => m.role === "USER")?.content;
    if (context.isEmpty && previousQuestion) {
      context = await getRelevantContext({
        userId,
        query: `${previousQuestion}\n${question}`,
        documentIds,
      });
    }
  } catch (error) {
    console.error("Retrieval failed", error);
    yield await abandon(
      error instanceof EmbeddingError ? "embedding_failed" : "failed",
      error instanceof EmbeddingError
        ? "The embedding model is not available, so your documents could not be searched."
        : "Your documents could not be searched. Please try again.",
    );
    return;
  }

  // Nothing relevant: answer directly instead of letting the model improvise.
  if (context.isEmpty) {
    yield { type: "token", text: NOT_FOUND_ANSWER };
    yield await saveAnswer(NOT_FOUND_ANSWER, []);
    return;
  }

  const sources = toSources(context);
  yield { type: "sources", sources };

  // --- Generate -------------------------------------------------------------
  yield { type: "status", stage: "generating" };

  const messages = buildChatMessages({
    question,
    contextText: context.text,
    history: fitHistory(previousMessages),
  });

  let answer = "";
  try {
    for await (const token of streamChat({ messages, signal })) {
      answer += token;
      yield { type: "token", text: token };
    }
  } catch (error) {
    const code = error instanceof OllamaError ? error.code : "failed";
    if (code !== "aborted") console.error("Generation failed", error);

    // Nothing usable was produced: report the failure and forget the question.
    if (!answer.trim()) {
      yield await abandon(
        ERROR_CODES[code] ?? "failed",
        error instanceof OllamaError ? error.message : "The answer could not be generated.",
      );
      return;
    }
    // Otherwise keep what was written so far (stopped by the user, or cut off).
  }

  answer = answer.trim() || NOT_FOUND_ANSWER;
  yield await saveAnswer(answer, resolveCitations(answer, sources));
}

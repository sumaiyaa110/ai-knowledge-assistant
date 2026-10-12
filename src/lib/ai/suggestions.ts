import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { completeChat } from "./ollama";
import {
  SUGGESTED_QUESTIONS_SCHEMA,
  SUGGESTED_QUESTION_COUNT,
  buildSuggestedQuestionsMessages,
} from "./prompts";

const EXCERPT_CHARS = 450;
const MAX_QUESTION_CHARS = 160;

const replySchema = z.object({ questions: z.array(z.string()).min(1) });

function readStored(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Ask the local model for a few questions a document can answer, and store
 * them on the document. Returns [] (and stores nothing) if the model is
 * unavailable or replies with something unusable.
 */
export async function generateSuggestedQuestions(documentId: string): Promise<string[]> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, chunkCount: true, status: true },
  });
  if (!document || document.status !== "READY" || document.chunkCount === 0) return [];

  // A few passages spread across the document: beginning, middle and end.
  const last = document.chunkCount - 1;
  const indexes = [...new Set([0, Math.floor(last / 2), last])];
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId, index: { in: indexes } },
    orderBy: { index: "asc" },
    select: { content: true },
  });
  const excerpt = chunks.map((chunk) => chunk.content.slice(0, EXCERPT_CHARS)).join("\n\n...\n\n");

  let questions: string[];
  try {
    const reply = await completeChat({
      messages: buildSuggestedQuestionsMessages(document.title, excerpt),
      format: SUGGESTED_QUESTIONS_SCHEMA,
      temperature: 0.4,
      maxTokens: 200,
    });
    questions = replySchema.parse(JSON.parse(reply)).questions;
  } catch {
    return [];
  }

  const cleaned = [...new Set(questions.map((q) => q.replace(/\s+/g, " ").trim()))]
    .filter((q) => q.length > 8 && q.length <= MAX_QUESTION_CHARS)
    .slice(0, SUGGESTED_QUESTION_COUNT);
  if (cleaned.length === 0) return [];

  await prisma.document.updateMany({
    where: { id: documentId },
    data: { suggestedQuestions: cleaned },
  });
  return cleaned;
}

// Generation after upload runs one document at a time, so a batch of uploads
// does not flood Ollama and starve chat requests.
const globalForSuggestions = globalThis as unknown as { suggestionQueue?: Promise<unknown> };

export function queueSuggestedQuestions(documentId: string): void {
  globalForSuggestions.suggestionQueue = (globalForSuggestions.suggestionQueue ?? Promise.resolve())
    .then(() => generateSuggestedQuestions(documentId))
    .catch(() => {});
}

/**
 * Up to three starter questions for a chat: taken from the documents in
 * scope, mixing documents when there are several. If none have been
 * generated yet, generate them now for the most recent document.
 */
export async function getSuggestedQuestions(
  userId: string,
  documentIds?: string[],
): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: { userId, status: "READY", ...(documentIds ? { id: { in: documentIds } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, suggestedQuestions: true },
  });
  if (documents.length === 0) return [];

  const stored = documents.map((document) => readStored(document.suggestedQuestions));
  if (stored.every((questions) => questions.length === 0)) {
    return generateSuggestedQuestions(documents[0].id);
  }

  // Round-robin: first question of each document, then the second, and so on.
  const picked: string[] = [];
  for (let round = 0; picked.length < SUGGESTED_QUESTION_COUNT && round < SUGGESTED_QUESTION_COUNT; round++) {
    for (const questions of stored) {
      if (questions[round] && picked.length < SUGGESTED_QUESTION_COUNT) picked.push(questions[round]);
    }
  }
  return picked;
}

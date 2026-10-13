import { QUIZ_OPTION_COUNT } from "@/models/study";
import type { ChatMessage } from "./ollama";

// Prompts and JSON schemas for the study tools. Each call is deliberately
// small (one passage in, a few items out): small local models follow a short,
// strict task far more reliably than one large "do everything" request.

const GROUNDING = "Use only what the text says. Never add facts from outside it.";

// --- Summary ----------------------------------------------------------------

export function buildSectionSummaryMessages(title: string, section: string): ChatMessage[] {
  return [
    { role: "system", content: `You summarize text faithfully and concisely. ${GROUNDING}` },
    {
      role: "user",
      content: `This is one part of the document "${title}":\n\n${section}\n\n---\n\nSummarize this part in 2 to 3 sentences. Keep the key facts, names and numbers. Reply with the summary only.`,
    },
  ];
}

export const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    short: { type: "string" },
    mainPoints: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
    concepts: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: { term: { type: "string" }, explanation: { type: "string" } },
        required: ["term", "explanation"],
      },
    },
  },
  required: ["short", "mainPoints", "concepts"],
};

/** `material` is the document text itself, or the summaries of its parts. */
export function buildSummaryMessages(title: string, material: string, isNotes: boolean): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You write study summaries of documents. ${GROUNDING} Reply with JSON only.`,
    },
    {
      role: "user",
      content: `${isNotes ? "Notes covering the parts of" : "Text of"} the document "${title}":\n\n${material}\n\n---\n\nWrite a summary of the whole document as JSON with these fields:\n- "short": 2 to 3 sentences saying what the document is about.\n- "mainPoints": 4 to 6 of its most important points, each one full sentence. Cover every part of the document, not only the beginning.\n- "concepts": 3 to 6 important terms from the document, each with "term" and a one-sentence "explanation" based on the document.`,
    },
  ];
}

// --- Quiz ---------------------------------------------------------------------

export function quizSchema(count: number) {
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: QUIZ_OPTION_COUNT,
              maxItems: QUIZ_OPTION_COUNT,
            },
            answerIndex: { type: "integer", minimum: 0, maximum: QUIZ_OPTION_COUNT - 1 },
            explanation: { type: "string" },
          },
          required: ["question", "options", "answerIndex", "explanation"],
        },
      },
    },
    required: ["questions"],
  };
}

export function buildQuizMessages(title: string, passage: string, count: number): ChatMessage[] {
  const noun = count === 1 ? "1 multiple-choice question" : `${count} different multiple-choice questions`;
  return [
    {
      role: "system",
      content: `You write multiple-choice questions that test understanding of a text. ${GROUNDING} Reply with JSON only.`,
    },
    {
      role: "user",
      content: `Passage from the document "${title}":\n\n${passage}\n\n---\n\nWrite exactly ${noun} about this passage, as JSON {"questions": [...]}.\n\nEach question has:\n- "question": a clear question about ONE specific fact stated in the passage. Do not mention "the passage" or "the text".\n- "options": exactly ${QUIZ_OPTION_COUNT} answer choices of at most 10 words each. Exactly one is correct according to the passage. The other three must be clearly wrong, not partly right and not rewordings of the correct one.\n- "answerIndex": the position of the correct option, counting from 0.\n- "explanation": one sentence that states the fact from the passage that makes the answer correct. Do not write "this option is correct".`,
    },
  ];
}

// --- Flashcards ------------------------------------------------------------------

export function flashcardsSchema(count: number) {
  return {
    type: "object",
    properties: {
      cards: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          properties: { front: { type: "string" }, back: { type: "string" } },
          required: ["front", "back"],
        },
      },
    },
    required: ["cards"],
  };
}

export function buildFlashcardMessages(title: string, passage: string, count: number): ChatMessage[] {
  const noun = count === 1 ? "1 flashcard" : `${count} different flashcards`;
  return [
    {
      role: "system",
      content: `You write flashcards for studying a text. ${GROUNDING} Reply with JSON only.`,
    },
    {
      role: "user",
      content: `Passage from the document "${title}":\n\n${passage}\n\n---\n\nWrite exactly ${noun} for this passage, as JSON {"cards": [...]}.\n\nEach card has:\n- "front": a short question about one fact, or a term to define. Do not mention "the passage" or "the text".\n- "back": the answer in one sentence of at most 25 words, taken from the passage. One fact per card.`,
    },
  ];
}

// --- Quiz answer check -----------------------------------------------------------

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export const ANSWER_CHECK_SCHEMA = {
  type: "object",
  properties: { answer: { type: "string", enum: [...OPTION_LETTERS] } },
  required: ["answer"],
};

/** Ask the model to answer a generated question itself, without the answer key. */
export function buildAnswerCheckMessages(passage: string, question: string, options: string[]): ChatMessage[] {
  const choices = options.map((option, i) => `${OPTION_LETTERS[i]}. ${option}`).join("\n");
  return [
    {
      role: "system",
      content: `You answer multiple-choice questions. ${GROUNDING} Reply with JSON only.`,
    },
    {
      role: "user",
      content: `Passage:\n\n${passage}\n\n---\n\nQuestion: ${question}\n\n${choices}\n\nWhich single option is correct according to the passage? Reply as JSON {"answer": "A"}, with the letter of your choice.`,
    },
  ];
}
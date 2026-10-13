import { z } from "zod";

// ---------------------------------------------------------------------------
// Summary (stored on Document.summary)
// ---------------------------------------------------------------------------

export const summaryContentSchema = z.object({
  short: z.string().trim().min(20),
  mainPoints: z.array(z.string().trim().min(5)).min(2).max(8),
  concepts: z
    .array(z.object({ term: z.string().trim().min(1), explanation: z.string().trim().min(5) }))
    .min(1)
    .max(8),
});

export type DocumentSummary = z.infer<typeof summaryContentSchema> & {
  generatedAt: string;
  model: string;
  /** How much of the document the summary is based on. */
  coverage: { sectionsUsed: number; sectionsTotal: number };
};

// ---------------------------------------------------------------------------
// Quiz and flashcards (stored in StudySet.content)
// ---------------------------------------------------------------------------

export const QUIZ_OPTION_COUNT = 4;

export const quizQuestionSchema = z.object({
  question: z.string().trim().min(8),
  options: z.array(z.string().trim().min(1)).length(QUIZ_OPTION_COUNT),
  answerIndex: z.number().int().min(0).max(QUIZ_OPTION_COUNT - 1),
  explanation: z.string().trim().min(5),
});

export const flashcardSchema = z.object({
  front: z.string().trim().min(3),
  back: z.string().trim().min(3),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema> & { pageNumber: number | null };
export type Flashcard = z.infer<typeof flashcardSchema> & { pageNumber: number | null };

export type QuizContent = { questions: QuizQuestion[] };
export type FlashcardsContent = { cards: Flashcard[] };

export type StudySetKind = "QUIZ" | "FLASHCARDS";

export type StudySetSummaryDTO = {
  id: string;
  type: StudySetKind;
  documentId: string;
  documentTitle: string;
  itemCount: number;
  createdAt: string;
};

export type StudySetDTO = StudySetSummaryDTO &
  ({ type: "QUIZ"; content: QuizContent } | { type: "FLASHCARDS"; content: FlashcardsContent });

export const QUIZ_COUNTS = [3, 5, 10] as const;
export const FLASHCARD_COUNTS = [6, 10, 16] as const;

export const createStudySetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("QUIZ"),
    documentId: z.string().min(1),
    count: z.union(QUIZ_COUNTS.map((n) => z.literal(n))),
  }),
  z.object({
    type: z.literal("FLASHCARDS"),
    documentId: z.string().min(1),
    count: z.union(FLASHCARD_COUNTS.map((n) => z.literal(n))),
  }),
]);

// ---------------------------------------------------------------------------
// Background generation jobs
// ---------------------------------------------------------------------------

export type ToolKind = "summary" | "quiz" | "flashcards";

export type ToolJobDTO = {
  kind: ToolKind;
  status: "queued" | "running" | "done" | "failed";
  /** Human-readable progress, e.g. "Writing question 2 of 5". */
  message: string;
  step: number;
  total: number;
  error: string | null;
  /** The study set created by a finished quiz or flashcards job. */
  resultId: string | null;
};

/** Everything the tools screen shows for one document. */
export type DocumentToolsState = {
  summary: DocumentSummary | null;
  jobs: Partial<Record<ToolKind, ToolJobDTO>>;
  studySets: StudySetSummaryDTO[];
};

import { z } from "zod";
import { InvalidModelOutputError, completeJson } from "@/lib/ai/json";
import { JobError, type ReportProgress } from "@/lib/ai/jobs";
import {
  ANSWER_CHECK_SCHEMA,
  OPTION_LETTERS,
  buildAnswerCheckMessages,
  buildFlashcardMessages,
  buildQuizMessages,
  flashcardsSchema,
  quizSchema,
} from "@/lib/ai/tool-prompts";
import { prisma } from "@/lib/database/prisma";
import {
  flashcardSchema,
  quizQuestionSchema,
  type Flashcard,
  type FlashcardsContent,
  type QuizContent,
  type QuizQuestion,
} from "@/models/study";
import { loadDocumentChunks, planItems, type Passage } from "./passages";

const MAX_QUESTIONS_PER_PASSAGE = 3;
const MAX_CARDS_PER_PASSAGE = 4;
/** How many times to ask for questions from one passage before moving on. */
const QUIZ_ROUNDS_PER_PASSAGE = 2;

type RawQuestion = z.infer<typeof quizQuestionSchema>;

const normalise = (text: string) => text.toLowerCase().replace(/\W+/g, " ").trim();

/** Study items must stand on their own, without pointing back at "the passage". */
const mentionsSource = (text: string) => /\b(the|this) (passage|text|excerpt)\b/i.test(text);

/** Fisher-Yates shuffle of a question's options, keeping track of the answer. */
function shuffleOptions(question: RawQuestion): RawQuestion {
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    answerIndex: order.indexOf(question.answerIndex),
  };
}

const validQuestion = quizQuestionSchema
  // Options must be distinct, otherwise "the" correct answer is ambiguous.
  .refine((q) => new Set(q.options.map(normalise)).size === q.options.length, {
    message: "options must be different from each other",
  })
  .refine((q) => !mentionsSource(q.question), { message: "question refers to the passage" });

const validCard = flashcardSchema.refine((card) => !mentionsSource(card.front), {
  message: "card refers to the passage",
});

/**
 * Second opinion on a generated question: give the model the passage and the
 * options without the answer key, and see whether it picks the same option.
 * A wrong key or an ambiguous question usually fails this, so it is dropped
 * instead of being shown to the user as fact.
 */
async function answerMatchesKey(passage: string, question: RawQuestion): Promise<boolean> {
  try {
    const reply = await completeJson({
      messages: buildAnswerCheckMessages(passage, question.question, question.options),
      format: ANSWER_CHECK_SCHEMA,
      schema: z.object({ answer: z.enum(OPTION_LETTERS) }),
      maxTokens: 20,
      temperature: 0,
      retries: 0,
    });
    return OPTION_LETTERS.indexOf(reply.answer) === question.answerIndex;
  } catch (error) {
    if (error instanceof InvalidModelOutputError) return false;
    throw error;
  }
}

/** Up to `wanted` checked questions from one passage. */
async function writeQuestions(
  title: string,
  passage: Passage,
  wanted: number,
  seen: Set<string>,
  onProgress: (accepted: number) => void,
): Promise<QuizQuestion[]> {
  const accepted: QuizQuestion[] = [];

  for (let round = 0; round < QUIZ_ROUNDS_PER_PASSAGE && accepted.length < wanted; round++) {
    const missing = wanted - accepted.length;
    let candidates: RawQuestion[];
    try {
      const reply = await completeJson({
        messages: buildQuizMessages(title, passage.content, missing),
        format: quizSchema(missing),
        schema: z.object({ questions: z.array(validQuestion).min(1) }),
        maxTokens: 220 * missing,
        // A second round needs different questions, not the same ones again.
        temperature: 0.4 + round * 0.3,
      });
      candidates = reply.questions.slice(0, missing);
    } catch (error) {
      // One unusable passage should not sink the whole quiz. Anything else
      // (model unreachable, timeout) ends the job.
      if (!(error instanceof InvalidModelOutputError)) throw error;
      continue;
    }

    for (const candidate of candidates) {
      const key = normalise(candidate.question);
      if (seen.has(key)) continue;
      seen.add(key);

      // Models tend to put the right answer first; shuffle so position is no
      // hint, and so the check below cannot simply repeat "A".
      const question = shuffleOptions(candidate);
      if (await answerMatchesKey(passage.content, question)) {
        accepted.push({ ...question, pageNumber: passage.pageNumber });
        onProgress(accepted.length);
      }
    }
  }
  return accepted;
}

/**
 * Write a multiple-choice quiz from passages spread across the document, one
 * small request per passage, and save it as a study set. Returns its id.
 * The quiz may have fewer questions than asked for if some failed the check.
 */
export async function generateQuiz(
  documentId: string,
  count: number,
  report: ReportProgress,
): Promise<string> {
  const { title, chunks } = await loadDocumentChunks(documentId);
  const plan = planItems(chunks, count, MAX_QUESTIONS_PER_PASSAGE);
  const questions: QuizQuestion[] = [];
  const seen = new Set<string>();

  const announce = (done: number) =>
    report(done, count, `Writing and checking question ${Math.min(done + 1, count)} of ${count}…`);

  for (const { passage, count: wanted } of plan) {
    announce(questions.length);
    const before = questions.length;
    questions.push(
      ...(await writeQuestions(title, passage, wanted, seen, (accepted) => announce(before + accepted))),
    );
  }

  if (questions.length === 0) {
    throw new JobError("The local model could not write any usable questions. Please try again.");
  }
  report(count, count, "Saving…");

  const content: QuizContent = { questions: questions.slice(0, count) };
  const studySet = await prisma.studySet.create({
    data: { documentId, type: "QUIZ", content },
    select: { id: true },
  });
  return studySet.id;
}

/** Write flashcards from passages spread across the document and save them. */
export async function generateFlashcards(
  documentId: string,
  count: number,
  report: ReportProgress,
): Promise<string> {
  const { title, chunks } = await loadDocumentChunks(documentId);
  const plan = planItems(chunks, count, MAX_CARDS_PER_PASSAGE);
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  for (const { passage, count: wanted } of plan) {
    report(cards.length, count, `Writing card ${cards.length + 1} of ${count}…`);
    try {
      const reply = await completeJson({
        messages: buildFlashcardMessages(title, passage.content, wanted),
        format: flashcardsSchema(wanted),
        schema: z.object({ cards: z.array(validCard).min(1) }),
        maxTokens: 110 * wanted,
        temperature: 0.4,
      });
      for (const card of reply.cards.slice(0, wanted)) {
        const key = normalise(card.front);
        if (seen.has(key)) continue;
        seen.add(key);
        cards.push({ ...card, pageNumber: passage.pageNumber });
      }
    } catch (error) {
      if (!(error instanceof InvalidModelOutputError)) throw error;
    }
  }

  if (cards.length === 0) {
    throw new JobError("The local model could not write any usable flashcards. Please try again.");
  }
  report(count, count, "Saving…");

  const content: FlashcardsContent = { cards: cards.slice(0, count) };
  const studySet = await prisma.studySet.create({
    data: { documentId, type: "FLASHCARDS", content },
    select: { id: true },
  });
  return studySet.id;
}

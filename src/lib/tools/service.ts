import type { Prisma } from "@prisma/client";
import { getJobs, startJob } from "@/lib/ai/jobs";
import { prisma } from "@/lib/database/prisma";
import type {
  DocumentSummary,
  DocumentToolsState,
  FlashcardsContent,
  QuizContent,
  StudySetDTO,
  StudySetKind,
  StudySetSummaryDTO,
  ToolJobDTO,
} from "@/models/study";
import { generateFlashcards, generateQuiz } from "./study-sets";
import { generateSummary } from "./summary";

type StudySetRow = {
  id: string;
  type: StudySetKind;
  documentId: string;
  content: Prisma.JsonValue;
  createdAt: Date;
  document: { title: string };
};

const studySetSelect = {
  id: true,
  type: true,
  documentId: true,
  content: true,
  createdAt: true,
  document: { select: { title: true } },
} as const;

function countItems(type: StudySetKind, content: Prisma.JsonValue): number {
  const data = content as unknown as Partial<QuizContent & FlashcardsContent>;
  return (type === "QUIZ" ? data.questions?.length : data.cards?.length) ?? 0;
}

function toSummaryDTO(row: StudySetRow): StudySetSummaryDTO {
  return {
    id: row.id,
    type: row.type,
    documentId: row.documentId,
    documentTitle: row.document.title,
    itemCount: countItems(row.type, row.content),
    createdAt: row.createdAt.toISOString(),
  };
}

/** A user's saved quizzes and flashcard decks, newest first. */
export async function listStudySets(userId: string, documentId?: string): Promise<StudySetSummaryDTO[]> {
  const rows = await prisma.studySet.findMany({
    where: { document: { userId, ...(documentId ? { id: documentId } : {}) } },
    orderBy: { createdAt: "desc" },
    select: studySetSelect,
  });
  return rows.map(toSummaryDTO);
}

/** Null when the set does not exist or belongs to someone else's document. */
export async function getStudySet(userId: string, studySetId: string): Promise<StudySetDTO | null> {
  const row = await prisma.studySet.findFirst({
    where: { id: studySetId, document: { userId } },
    select: studySetSelect,
  });
  if (!row) return null;
  return { ...toSummaryDTO(row), content: row.content } as unknown as StudySetDTO;
}

export async function deleteStudySet(userId: string, studySetId: string): Promise<boolean> {
  const { count } = await prisma.studySet.deleteMany({
    where: { id: studySetId, document: { userId } },
  });
  return count > 0;
}

/** Summary, running jobs and saved sets for one document the user owns. */
export async function getDocumentToolsState(
  userId: string,
  documentId: string,
): Promise<DocumentToolsState | null> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { summary: true },
  });
  if (!document) return null;

  return {
    summary: (document.summary as unknown as DocumentSummary | null) ?? null,
    jobs: getJobs(documentId),
    studySets: await listStudySets(userId, documentId),
  };
}

export type StartResult =
  | { ok: true; job: ToolJobDTO }
  | { ok: false; reason: "not_found" | "not_ready" | "already_running" };

async function checkReady(userId: string, documentId: string): Promise<"not_found" | "not_ready" | null> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { status: true },
  });
  if (!document) return "not_found";
  return document.status === "READY" ? null : "not_ready";
}

export async function startSummary(userId: string, documentId: string): Promise<StartResult> {
  const problem = await checkReady(userId, documentId);
  if (problem) return { ok: false, reason: problem };

  const job = startJob(documentId, "summary", (report) => generateSummary(documentId, report));
  return job ? { ok: true, job } : { ok: false, reason: "already_running" };
}

export async function startStudySet(
  userId: string,
  documentId: string,
  type: StudySetKind,
  count: number,
): Promise<StartResult> {
  const problem = await checkReady(userId, documentId);
  if (problem) return { ok: false, reason: problem };

  const job =
    type === "QUIZ"
      ? startJob(documentId, "quiz", (report) => generateQuiz(documentId, count, report))
      : startJob(documentId, "flashcards", (report) => generateFlashcards(documentId, count, report));
  return job ? { ok: true, job } : { ok: false, reason: "already_running" };
}

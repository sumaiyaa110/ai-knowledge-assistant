import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteStudySetButton } from "@/components/tools/delete-study-set-button";
import { FlashcardDeck } from "@/components/tools/flashcard-deck";
import { QuizPlayer } from "@/components/tools/quiz-player";
import { requireUser } from "@/lib/auth/session";
import { getStudySet } from "@/lib/tools/service";

type PageProps = { params: Promise<{ id: string }> };

const titleOf = (type: "QUIZ" | "FLASHCARDS") => (type === "QUIZ" ? "Quiz" : "Flashcards");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUser();
  const studySet = await getStudySet(user.id, (await params).id);
  return { title: studySet ? `${titleOf(studySet.type)}: ${studySet.documentTitle}` : "Study set" };
}

export default async function StudySetPage({ params }: PageProps) {
  const user = await requireUser();
  const studySet = await getStudySet(user.id, (await params).id);
  if (!studySet) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/tools?document=${studySet.documentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        AI Tools
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{titleOf(studySet.type)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From{" "}
            <Link href={`/documents/${studySet.documentId}`} className="underline underline-offset-4">
              {studySet.documentTitle}
            </Link>
            . Written by your local model, so check anything that looks wrong.
          </p>
        </div>
        <DeleteStudySetButton studySetId={studySet.id} documentId={studySet.documentId} />
      </div>

      {studySet.type === "QUIZ" ? (
        <QuizPlayer questions={studySet.content.questions} />
      ) : (
        <FlashcardDeck cards={studySet.content.cards} />
      )}
    </div>
  );
}

"use client";

import { HelpCircle, Layers, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import type { StudySetSummaryDTO } from "@/models/study";

type StudySetListProps = {
  studySets: StudySetSummaryDTO[];
  onDelete: (id: string) => Promise<void>;
};

function StudySetRow({ studySet, onDelete }: { studySet: StudySetSummaryDTO } & Pick<StudySetListProps, "onDelete">) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const isQuiz = studySet.type === "QUIZ";
  const Icon = isQuiz ? HelpCircle : Layers;
  const label = isQuiz
    ? `Quiz · ${studySet.itemCount} ${studySet.itemCount === 1 ? "question" : "questions"}`
    : `Flashcards · ${studySet.itemCount} ${studySet.itemCount === 1 ? "card" : "cards"}`;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={`/tools/sets/${studySet.id}`}
          className="block truncate text-sm font-medium hover:underline"
        >
          {label}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {studySet.documentTitle}
          {" · "}
          <span suppressHydrationWarning>{formatRelativeTime(new Date(studySet.createdAt))}</span>
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete(studySet.id);
              setBusy(false);
              setConfirming(false);
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${label} for ${studySet.documentTitle}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

export function StudySetList({ studySets, onDelete }: StudySetListProps) {
  if (studySets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Quizzes and flashcards you generate are saved here.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {studySets.map((studySet) => (
        <StudySetRow key={studySet.id} studySet={studySet} onDelete={onDelete} />
      ))}
    </ul>
  );
}

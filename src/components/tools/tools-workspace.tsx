"use client";

import { ArrowRight, FileText, HelpCircle, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import {
  FLASHCARD_COUNTS,
  QUIZ_COUNTS,
  type DocumentToolsState,
  type StudySetKind,
  type StudySetSummaryDTO,
  type ToolJobDTO,
  type ToolKind,
} from "@/models/study";
import { JobProgress } from "./job-progress";
import { StudySetList } from "./study-set-list";
import { SummaryView } from "./summary-view";

const POLL_INTERVAL_MS = 1500;
const EMPTY_STATE: DocumentToolsState = { summary: null, jobs: {}, studySets: [] };

const isActive = (job: ToolJobDTO | undefined) =>
  job?.status === "queued" || job?.status === "running";

type ToolsWorkspaceProps = {
  documents: { id: string; title: string }[];
  initialDocumentId: string;
  initialState: DocumentToolsState;
  initialStudySets: StudySetSummaryDTO[];
};

type GeneratorCardProps = {
  title: string;
  description: string;
  icon: typeof HelpCircle;
  unit: string;
  counts: readonly number[];
  job: ToolJobDTO | undefined;
  onGenerate: (count: number) => void;
};

/** A quiz or flashcards generator: choose how many, then start. */
function GeneratorCard({ title, description, icon: Icon, unit, counts, job, onGenerate }: GeneratorCardProps) {
  const [count, setCount] = useState(counts[1] ?? counts[0]);
  const active = isActive(job);
  const selectId = `count-${unit}`;

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <JobProgress job={job} />

      {job?.status === "done" && job.resultId && (
        <Link
          href={`/tools/sets/${job.resultId}`}
          className={buttonVariants({ variant: "outline", className: "justify-between" })}
        >
          Open the new {title.toLowerCase()}
          <ArrowRight />
        </Link>
      )}

      {!active && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <label htmlFor={selectId} className="sr-only">
            Number of {unit}
          </label>
          <select
            id={selectId}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="h-8 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {counts.map((option) => (
              <option key={option} value={option}>
                {option} {unit}
              </option>
            ))}
          </select>
          <Button onClick={() => onGenerate(count)}>
            <Sparkles />
            Generate
          </Button>
        </div>
      )}
    </section>
  );
}

/** Pick a document, then summarize it or turn it into a quiz or flashcards. */
export function ToolsWorkspace({
  documents,
  initialDocumentId,
  initialState,
  initialStudySets,
}: ToolsWorkspaceProps) {
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [state, setState] = useState(initialState);
  const [studySets, setStudySets] = useState(initialStudySets);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const [stateRes, setsRes] = await Promise.all([
        fetch(`/api/documents/${id}/tools`, { cache: "no-store", signal }),
        fetch("/api/study-sets", { cache: "no-store", signal }),
      ]);
      if (stateRes.ok) setState((await stateRes.json()) as DocumentToolsState);
      if (setsRes.ok) setStudySets(((await setsRes.json()) as { studySets: StudySetSummaryDTO[] }).studySets);
    } catch {
      // Aborted or a transient network error: the next poll will try again.
    }
  }, []);

  // Load a document's state when it is picked from the list. The first one
  // was rendered by the server, so nothing needs fetching until the user
  // changes the selection.
  const selectionChanged = useRef(false);
  useEffect(() => {
    if (!selectionChanged.current) return;
    const controller = new AbortController();
    void refresh(documentId, controller.signal);
    return () => controller.abort();
  }, [documentId, refresh]);

  // Poll only while something is being generated for this document.
  const anyActive = Object.values(state.jobs).some(isActive);
  useEffect(() => {
    if (!anyActive) return;
    const timer = setInterval(() => void refresh(documentId), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [anyActive, documentId, refresh]);

  /** Show the job as queued right away, then let polling take over. */
  function markQueued(kind: ToolKind, job: ToolJobDTO) {
    setState((current) => ({ ...current, jobs: { ...current.jobs, [kind]: job } }));
  }

  async function startSummary() {
    setError(null);
    const result = await sendJson<{ job: ToolJobDTO }>(`/api/documents/${documentId}/summary`, "POST");
    if (result.ok) markQueued("summary", result.data.job);
    else setError(result.error);
  }

  async function startStudySet(type: StudySetKind, count: number) {
    setError(null);
    const result = await sendJson<{ job: ToolJobDTO }>("/api/study-sets", "POST", {
      type,
      documentId,
      count,
    });
    if (result.ok) markQueued(type === "QUIZ" ? "quiz" : "flashcards", result.data.job);
    else setError(result.error);
  }

  async function deleteStudySet(id: string) {
    const result = await sendJson(`/api/study-sets/${id}`, "DELETE");
    setError(result.ok ? null : result.error);
    await refresh(documentId);
  }

  const summaryJob = state.jobs.summary;
  const summaryActive = isActive(summaryJob);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tools-document" className="flex items-center gap-2 text-sm font-medium">
          <FileText className="size-4 text-muted-foreground" />
          Document
        </label>
        <select
          id="tools-document"
          value={documentId}
          onChange={(event) => {
            selectionChanged.current = true;
            setState(EMPTY_STATE);
            setError(null);
            setDocumentId(event.target.value);
          }}
          className="h-9 max-w-full min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-md"
        >
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="size-4 text-muted-foreground" />
            </span>
            <div>
              <h3 className="font-medium">Summary</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A short overview, the main points and the important concepts.
              </p>
            </div>
          </div>
          {!summaryActive && (
            <Button variant={state.summary ? "outline" : "default"} onClick={startSummary}>
              <Sparkles />
              {state.summary ? "Regenerate" : "Summarize"}
            </Button>
          )}
        </div>
        <JobProgress job={summaryJob} />
        {state.summary && <SummaryView summary={state.summary} />}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <GeneratorCard
          title="Quiz"
          description="Multiple-choice questions with answers and explanations."
          icon={HelpCircle}
          unit="questions"
          counts={QUIZ_COUNTS}
          job={state.jobs.quiz}
          onGenerate={(count) => void startStudySet("QUIZ", count)}
        />
        <GeneratorCard
          title="Flashcards"
          description="Question and answer cards to study from."
          icon={Layers}
          unit="cards"
          counts={FLASHCARD_COUNTS}
          job={state.jobs.flashcards}
          onGenerate={(count) => void startStudySet("FLASHCARDS", count)}
        />
      </div>

      <section aria-labelledby="saved-sets" className="space-y-3">
        <h2 id="saved-sets" className="text-sm font-medium text-muted-foreground">
          Saved study sets
        </h2>
        <StudySetList studySets={studySets} onDelete={deleteStudySet} />
      </section>
    </div>
  );
}

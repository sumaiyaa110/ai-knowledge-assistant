import type { ToolJobDTO, ToolKind } from "@/models/study";
import { InvalidModelOutputError } from "./json";
import { OllamaError } from "./ollama";

// Study-tool generation takes from tens of seconds to minutes on a local
// model, so it runs as a background job: the request that starts it returns
// immediately and the browser polls for progress.
//
// Jobs are kept in memory and run one at a time (the model can only do one
// thing at a time anyway). A server restart forgets running jobs; their
// results are only written to the database when they finish, so nothing is
// left half-done.

type Job = ToolJobDTO & { documentId: string; finishedAt: number | null };

export type ReportProgress = (step: number, total: number, message: string) => void;

/** Does the work and returns the id of what it created, if any. */
type JobRunner = (report: ReportProgress) => Promise<string | null>;

const FINISHED_JOB_TTL_MS = 10 * 60 * 1000;

const globalForJobs = globalThis as unknown as {
  toolJobs?: { jobs: Map<string, Job>; tail: Promise<void> };
};
const state = (globalForJobs.toolJobs ??= {
  jobs: new Map<string, Job>(),
  tail: Promise.resolve(),
});

const keyOf = (documentId: string, kind: ToolKind) => `${documentId}:${kind}`;
const isActive = (job: Job) => job.status === "queued" || job.status === "running";

function toDTO({ kind, status, message, step, total, error, resultId }: Job): ToolJobDTO {
  return { kind, status, message, step, total, error, resultId };
}

function describeFailure(error: unknown): string {
  if (error instanceof OllamaError) return error.message;
  if (error instanceof InvalidModelOutputError) {
    return "The local model did not produce usable output. Try again; a larger model gives better results.";
  }
  if (error instanceof JobError) return error.message;
  return "Something went wrong while generating. Please try again.";
}

/** A failure with a message meant for the user. */
export class JobError extends Error {}

/**
 * Queue a job for a document. Returns null if the same kind of job is already
 * queued or running for it.
 */
export function startJob(documentId: string, kind: ToolKind, run: JobRunner): ToolJobDTO | null {
  const key = keyOf(documentId, kind);
  const existing = state.jobs.get(key);
  if (existing && isActive(existing)) return null;

  const job: Job = {
    documentId,
    kind,
    status: "queued",
    message: "Waiting for the local model…",
    step: 0,
    total: 0,
    error: null,
    resultId: null,
    finishedAt: null,
  };
  state.jobs.set(key, job);

  state.tail = state.tail.then(async () => {
    job.status = "running";
    job.message = "Starting…";
    try {
      job.resultId = await run((step, total, message) => {
        job.step = step;
        job.total = total;
        job.message = message;
      });
      job.status = "done";
      job.message = "Done";
    } catch (error) {
      if (!(error instanceof OllamaError) && !(error instanceof JobError)) {
        console.error(`${kind} job failed for document ${documentId}`, error);
      }
      job.status = "failed";
      job.error = describeFailure(error);
    } finally {
      job.finishedAt = Date.now();
    }
  });

  return toDTO(job);
}

/** Current and recently finished jobs for a document, by kind. */
export function getJobs(documentId: string): Partial<Record<ToolKind, ToolJobDTO>> {
  const now = Date.now();
  const result: Partial<Record<ToolKind, ToolJobDTO>> = {};

  for (const [key, job] of state.jobs) {
    if (job.finishedAt !== null && now - job.finishedAt > FINISHED_JOB_TTL_MS) {
      state.jobs.delete(key);
    } else if (job.documentId === documentId) {
      result[job.kind] = toDTO(job);
    }
  }
  return result;
}

import { prisma } from "@/lib/database/prisma";
import { PROCESSING_STATUSES } from "@/models/document";
import { processDocument } from "./pipeline";

// A minimal in-process job queue: documents are processed one at a time, in
// the order they were uploaded, without blocking the request that enqueued
// them. State lives on globalThis so dev hot reloads don't create a second queue.

type QueueState = { tail: Promise<void>; pending: Set<string>; resumed: boolean };

const globalForQueue = globalThis as unknown as { documentQueue?: QueueState };

const state: QueueState = (globalForQueue.documentQueue ??= {
  tail: Promise.resolve(),
  pending: new Set(),
  resumed: false,
});

/** Schedule a document for processing and return immediately. */
export function enqueueDocument(documentId: string): void {
  if (state.pending.has(documentId)) return;
  state.pending.add(documentId);

  state.tail = state.tail
    .then(() => processDocument(documentId))
    .catch((error) => console.error("Document queue error", error))
    .finally(() => state.pending.delete(documentId));
}

/**
 * Re-queue documents left mid-pipeline by a server restart. The queue is in
 * memory, so without this they would stay "processing" forever.
 */
export async function resumeInterruptedDocuments(): Promise<void> {
  if (state.resumed) return;
  state.resumed = true;

  const interrupted = await prisma.document.findMany({
    where: { status: { in: PROCESSING_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  for (const { id } of interrupted) enqueueDocument(id);
  if (interrupted.length > 0) {
    console.log(`Resuming ${interrupted.length} interrupted document(s)`);
  }
}

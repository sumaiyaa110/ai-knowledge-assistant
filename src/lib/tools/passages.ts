import { prisma } from "@/lib/database/prisma";
import { JobError } from "@/lib/ai/jobs";

export type Passage = { content: string; pageNumber: number | null };

const MIN_USEFUL_CHARS = 200;

/** A READY document's title and chunks, or a JobError explaining why not. */
export async function loadDocumentChunks(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      title: true,
      status: true,
      chunks: { orderBy: { index: "asc" }, select: { content: true, pageNumber: true } },
    },
  });
  if (!document) throw new JobError("The document no longer exists.");
  if (document.status !== "READY") {
    throw new JobError("The document has not finished processing yet.");
  }
  if (document.chunks.length === 0) {
    throw new JobError("This document has no text to work with.");
  }
  return { title: document.title, chunks: document.chunks };
}

/** `count` items picked at even intervals, so they span the whole list. */
export function pickEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, i) => items[Math.floor((i * items.length) / count)]);
}

/**
 * Decide which passages to write study items from, and how many from each,
 * so that `total` items are spread across the document rather than all coming
 * from its first page. With few passages, each gets several items.
 */
export function planItems(
  chunks: Passage[],
  total: number,
  maxPerPassage: number,
): { passage: Passage; count: number }[] {
  const useful = chunks.filter((chunk) => chunk.content.length >= MIN_USEFUL_CHARS);
  const pool = useful.length > 0 ? useful : chunks;

  const passages = pickEvenly(pool, Math.min(total, pool.length));
  const plan = passages.map((passage) => ({ passage, count: 0 }));

  // Deal the items out one at a time; stop when every passage is full.
  let remaining = total;
  while (remaining > 0 && plan.some((entry) => entry.count < maxPerPassage)) {
    for (const entry of plan) {
      if (remaining === 0) break;
      if (entry.count < maxPerPassage) {
        entry.count++;
        remaining--;
      }
    }
  }
  return plan.filter((entry) => entry.count > 0);
}

/**
 * Join consecutive chunks into sections of roughly `sectionChars`, dropping
 * the overlap that neighbouring chunks share.
 */
export function buildSections(chunks: Passage[], sectionChars: number): string[] {
  const sections: string[] = [];
  let current = "";

  for (const chunk of chunks) {
    let text = chunk.content;
    // Chunks repeat up to ~150 characters of their predecessor; cut that off.
    for (let size = Math.min(160, text.length, current.length); size >= 20; size--) {
      if (current.endsWith(text.slice(0, size))) {
        text = text.slice(size);
        break;
      }
    }
    if (current && current.length + text.length > sectionChars) {
      sections.push(current.trim());
      current = "";
    }
    current += (current ? " " : "") + text.trim();
  }
  if (current.trim()) sections.push(current.trim());
  return sections;
}

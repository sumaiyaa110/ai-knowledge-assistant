import type { DocumentStatus } from "@prisma/client";
import { queueSuggestedQuestions } from "@/lib/ai/suggestions";
import { prisma } from "@/lib/database/prisma";
import { readUpload } from "@/lib/documents/storage";
import { EmbeddingError } from "@/lib/embeddings/embed";
import { getKindFromMime } from "@/models/document";
import { chunkPages } from "./chunk";
import { cleanText, removeRepeatedLines } from "./clean";
import { embedDocumentChunks } from "./embed";
import { ExtractionError, extractPages } from "./extract";

const INSERT_BATCH_SIZE = 500;

/** The document was deleted while it was being processed. */
class DocumentGoneError extends Error {}

async function setStatus(documentId: string, status: DocumentStatus, error: string | null = null) {
  // updateMany instead of update: it does not throw if the row has been deleted.
  const { count } = await prisma.document.updateMany({
    where: { id: documentId },
    data: { status, error },
  });
  if (count === 0) throw new DocumentGoneError();
}

/**
 * Run one document through the whole pipeline, recording each stage in the
 * database so the UI can show progress. Never throws: failures end in FAILED.
 *
 *   UPLOADED -> EXTRACTING -> CHUNKING -> EMBEDDING -> READY   (or FAILED)
 */
export async function processDocument(documentId: string): Promise<void> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, mimeType: true, storagePath: true },
    });
    if (!document) return;

    await setStatus(documentId, "EXTRACTING");
    const file = await readUpload(document.storagePath);
    const extracted = await extractPages(file, getKindFromMime(document.mimeType));
    const pages = removeRepeatedLines(
      extracted.pages.map((page) => ({ ...page, text: cleanText(page.text) })),
    );
    if (!pages.some((page) => page.text)) {
      throw new ExtractionError(
        extracted.pageCount === null
          ? "The file is empty."
          : "No text could be extracted. Scanned PDFs need OCR, which is not supported.",
      );
    }

    await setStatus(documentId, "CHUNKING");
    const chunks = chunkPages(pages);

    // Replace any chunks from a previous run in one transaction, so a
    // document never ends up with a mix of old and new chunks.
    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({ where: { documentId } });
      for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
        await tx.documentChunk.createMany({
          data: chunks.slice(i, i + INSERT_BATCH_SIZE).map((chunk) => ({ ...chunk, documentId })),
        });
      }
      const { count } = await tx.document.updateMany({
        where: { id: documentId },
        data: { chunkCount: chunks.length, pageCount: extracted.pageCount },
      });
      if (count === 0) throw new DocumentGoneError();
    });

    await setStatus(documentId, "EMBEDDING");
    // Throws unless every chunk ends up with a stored vector, so READY always
    // means the document is fully searchable.
    await embedDocumentChunks(documentId);

    await setStatus(documentId, "READY");
    // Starter questions for the chat screen. Not awaited: the document is
    // usable without them, and the local model can take a while.
    queueSuggestedQuestions(documentId);
  } catch (error) {
    if (error instanceof DocumentGoneError) return;
    await markFailed(documentId, error);
  }
}

/** Record a failure with a message the user can act on. */
export async function markFailed(documentId: string, error: unknown): Promise<void> {
  let message = "Something went wrong while processing this document.";
  if (error instanceof ExtractionError) {
    message = error.message;
  } else if (error instanceof EmbeddingError) {
    message =
      "The text was extracted, but embeddings could not be generated. Check that the embedding model is available, then retry.";
  }
  if (!(error instanceof ExtractionError)) {
    console.error(`Processing failed for document ${documentId}`, error);
  }
  await setStatus(documentId, "FAILED", message).catch(() => {});
}

/**
 * Embed a document whose chunks already exist (uploaded before embeddings
 * were available, or left half-embedded). Returns the number of new vectors.
 */
export async function embedExistingDocument(documentId: string): Promise<number> {
  try {
    await setStatus(documentId, "EMBEDDING");
    const embedded = await embedDocumentChunks(documentId);
    await setStatus(documentId, "READY");
    return embedded;
  } catch (error) {
    if (!(error instanceof DocumentGoneError)) await markFailed(documentId, error);
    throw error;
  }
}

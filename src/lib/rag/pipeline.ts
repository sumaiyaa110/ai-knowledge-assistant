import type { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { readUpload } from "@/lib/documents/storage";
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
    await embedDocumentChunks(documentId);

    await setStatus(documentId, "READY");
  } catch (error) {
    if (error instanceof DocumentGoneError) return;

    const message =
      error instanceof ExtractionError
        ? error.message
        : "Something went wrong while processing this document.";
    if (!(error instanceof ExtractionError)) {
      console.error(`Processing failed for document ${documentId}`, error);
    }
    await setStatus(documentId, "FAILED", message).catch(() => {});
  }
}

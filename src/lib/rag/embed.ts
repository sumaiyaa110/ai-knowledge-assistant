import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import { saveChunkVectors } from "@/lib/database/vectors";
import { EmbeddingError, embedTexts } from "@/lib/embeddings/embed";

/**
 * Generate and store a vector for every chunk of a document that does not
 * have one from the current model yet. Each batch is saved as soon as it is
 * computed, so an interrupted run resumes where it stopped.
 *
 * Throws EmbeddingError if any chunk is still without a vector afterwards.
 */
export async function embedDocumentChunks(documentId: string): Promise<number> {
  const { model } = config.embeddings;

  // Chunks with no vector, or with one from a different model.
  const needsEmbedding = {
    documentId,
    OR: [{ embedding: null }, { embedding: { model: { not: model } } }],
  };

  const chunks = await prisma.documentChunk.findMany({
    where: needsEmbedding,
    orderBy: { index: "asc" },
    select: { id: true, content: true },
  });

  await embedTexts(
    chunks.map((chunk) => chunk.content),
    (results, offset) =>
      saveChunkVectors(
        results.map((result, i) => ({ chunkId: chunks[offset + i].id, ...result })),
        model,
      ),
  );

  const missing = await prisma.documentChunk.count({ where: needsEmbedding });
  if (missing > 0) {
    throw new EmbeddingError(`${missing} chunk(s) could not be embedded.`);
  }
  return chunks.length;
}

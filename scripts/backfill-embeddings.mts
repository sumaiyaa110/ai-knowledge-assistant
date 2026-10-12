// Generate embeddings for documents that have chunks but are missing vectors
// (or have vectors from a different model than EMBEDDING_MODEL).
//
//   npm run embeddings:backfill
//
// Safe to run repeatedly: documents that are already fully embedded are skipped.
import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import { embedExistingDocument } from "@/lib/rag/pipeline";

const { model } = config.embeddings;

const documents = await prisma.document.findMany({
  where: {
    OR: [
      // Chunks with no vector, or a vector from another model.
      {
        chunks: {
          some: { OR: [{ embedding: null }, { embedding: { model: { not: model } } }] },
        },
      },
      // Chunked, but an earlier embedding attempt did not finish cleanly.
      { status: { in: ["EMBEDDING", "FAILED"] }, chunkCount: { gt: 0 } },
    ],
  },
  orderBy: { createdAt: "asc" },
  select: { id: true, title: true, chunkCount: true, status: true },
});

if (documents.length === 0) {
  console.log(`Nothing to do: every document is embedded with ${model}.`);
} else {
  console.log(`Embedding ${documents.length} document(s) with ${model}...`);
}

let succeeded = 0;
let failed = 0;

for (const document of documents) {
  const started = Date.now();
  try {
    const embedded = await embedExistingDocument(document.id);
    succeeded++;
    console.log(
      `  ok      ${document.title}: ${embedded} of ${document.chunkCount} chunks embedded in ${((Date.now() - started) / 1000).toFixed(1)}s (was ${document.status})`,
    );
  } catch (error) {
    failed++;
    console.error(
      `  FAILED  ${document.title}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

if (documents.length > 0) console.log(`Done: ${succeeded} embedded, ${failed} failed.`);

await prisma.$disconnect();
process.exit(failed > 0 ? 1 : 0);

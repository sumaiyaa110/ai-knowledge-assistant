import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Prisma has no vector type, so everything touching embeddings.vector is raw
// SQL. Values are always passed as bound parameters, never string-built.

/** pgvector's text format: "[0.1,0.2,...]", cast with ::vector in SQL. */
export function toVectorLiteral(vector: number[]): string {
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Vector contains a non-finite number");
  }
  return `[${vector.join(",")}]`;
}

export type ChunkVector = { chunkId: string; vector: number[]; tokenCount: number };

/**
 * Store one batch of vectors and the model's real token counts in a single
 * transaction. Re-embedding a chunk replaces its previous vector.
 */
export async function saveChunkVectors(rows: ChunkVector[], model: string): Promise<void> {
  if (rows.length === 0) return;

  const embeddingValues = rows.map(
    (row) =>
      Prisma.sql`(${randomUUID()}, ${row.chunkId}, ${model}, ${toVectorLiteral(row.vector)}::vector)`,
  );
  const tokenValues = rows.map((row) => Prisma.sql`(${row.chunkId}, ${row.tokenCount}::int)`);

  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO embeddings (id, "chunkId", model, vector)
      VALUES ${Prisma.join(embeddingValues)}
      ON CONFLICT ("chunkId") DO UPDATE
        SET vector = EXCLUDED.vector, model = EXCLUDED.model, "createdAt" = now()
    `,
    prisma.$executeRaw`
      UPDATE document_chunks AS c
      SET "tokenCount" = v.tokens
      FROM (VALUES ${Prisma.join(tokenValues)}) AS v(id, tokens)
      WHERE c.id = v.id
    `,
  ]);
}

export type SimilarChunkRow = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

type SimilarChunkQuery = {
  userId: string;
  queryVector: number[];
  model: string;
  limit: number;
  /** Restrict the search to these documents. Omit to search all of the user's. */
  documentIds?: string[];
};

/**
 * Nearest chunks to a query vector by cosine similarity, restricted to one
 * user's READY documents.
 *
 * `<=>` is pgvector's cosine distance (0 = same direction, 2 = opposite), so
 * similarity is 1 - distance. Ordering by the bare `<=>` expression is what
 * lets Postgres use the HNSW index.
 */
export async function findSimilarChunks({
  userId,
  queryVector,
  model,
  limit,
  documentIds,
}: SimilarChunkQuery): Promise<SimilarChunkRow[]> {
  if (documentIds && documentIds.length === 0) return [];

  const vector = toVectorLiteral(queryVector);
  const documentFilter = documentIds
    ? Prisma.sql`AND d.id IN (${Prisma.join(documentIds)})`
    : Prisma.empty;

  const [, rows] = await prisma.$transaction([
    // The index returns its nearest candidates first and the WHERE clause
    // filters them afterwards. With many users, the nearest candidates may all
    // belong to someone else and too few rows would survive. Iterative scan
    // (pgvector 0.8+) keeps walking the index until LIMIT rows pass the filter.
    prisma.$executeRaw`SET LOCAL hnsw.iterative_scan = strict_order`,
    prisma.$queryRaw<SimilarChunkRow[]>`
      SELECT
        c.id AS "chunkId",
        d.id AS "documentId",
        d.title AS "documentTitle",
        c.index AS "chunkIndex",
        c."pageNumber",
        c.content,
        (1 - (e.vector <=> ${vector}::vector))::float8 AS similarity
      FROM embeddings e
      JOIN document_chunks c ON c.id = e."chunkId"
      JOIN documents d ON d.id = c."documentId"
      WHERE d."userId" = ${userId}
        AND d.status = 'READY'
        AND e.model = ${model}
        ${documentFilter}
      ORDER BY e.vector <=> ${vector}::vector
      LIMIT ${limit}
    `,
  ]);
  return rows;
}

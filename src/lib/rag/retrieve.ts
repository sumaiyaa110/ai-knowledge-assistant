import { config } from "@/lib/config";
import { findSimilarChunks } from "@/lib/database/vectors";
import { embedQuery } from "@/lib/embeddings/embed";
import type { RelevantContext, RetrievedChunk, SearchOptions } from "@/models/retrieval";

const MAX_QUERY_CHARS = 2000;
const MAX_LIMIT = 50;

/**
 * Semantic search over one user's documents: embed the query with the same
 * model as the chunks, then rank chunks by cosine similarity.
 *
 * Returns an empty array for a blank query, when the user has no indexed
 * documents, or when nothing reaches `minSimilarity`.
 */
export async function searchSimilarChunks({
  userId,
  query,
  documentIds,
  limit = config.rag.topK,
  minSimilarity = 0,
}: SearchOptions): Promise<RetrievedChunk[]> {
  const text = query.trim().slice(0, MAX_QUERY_CHARS);
  if (!text) return [];
  if (documentIds && documentIds.length === 0) return [];

  const queryVector = await embedQuery(text);
  const rows = await findSimilarChunks({
    userId,
    queryVector,
    model: config.embeddings.model,
    limit: Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT),
    documentIds,
  });

  // Rows arrive best-first, so everything after the first miss is also a miss.
  return rows.filter((row) => row.similarity >= minSimilarity);
}

/** "[1] Title (page 3)" style header followed by the chunk text. */
function formatSource(chunk: RetrievedChunk, number: number): string {
  const page = chunk.pageNumber === null ? "" : ` (page ${chunk.pageNumber})`;
  return `[${number}] ${chunk.documentTitle}${page}\n${chunk.content}`;
}

/**
 * The context to ground an answer in: the most relevant chunks above the
 * relevance threshold, plus a numbered text block ready to put in a prompt.
 * `isEmpty` tells the caller to say "not found in your documents" instead of
 * asking the LLM.
 */
export async function getRelevantContext(options: SearchOptions): Promise<RelevantContext> {
  const chunks = await searchSimilarChunks({
    ...options,
    minSimilarity: options.minSimilarity ?? config.rag.minSimilarity,
  });

  return {
    chunks,
    text: chunks.map((chunk, i) => formatSource(chunk, i + 1)).join("\n\n---\n\n"),
    isEmpty: chunks.length === 0,
  };
}

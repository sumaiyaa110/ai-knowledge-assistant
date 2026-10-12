import { config } from "@/lib/config";
import { findSimilarChunks } from "@/lib/database/vectors";
import { embedQuery } from "@/lib/embeddings/embed";
import type { RelevantContext, RetrievedChunk, SearchOptions } from "@/models/retrieval";
import { estimateTokens } from "./chunk";

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

/**
 * One chunk as a tagged block. Tags (rather than a "[1] Title" heading) keep
 * small models from copying the heading into the answer, and make it clear
 * where a source ends.
 */
function formatSource(chunk: RetrievedChunk, number: number): string {
  const title = chunk.documentTitle.replace(/"/g, "'");
  const page = chunk.pageNumber === null ? "" : ` page="${chunk.pageNumber}"`;
  return `<source id="${number}" document="${title}"${page}>\n${chunk.content}\n</source>`;
}

/**
 * The context to ground an answer in: the most relevant chunks above the
 * relevance threshold, plus a numbered text block ready to put in a prompt.
 * `isEmpty` tells the caller to say "not found in your documents" instead of
 * asking the LLM.
 */
export async function getRelevantContext(options: SearchOptions): Promise<RelevantContext> {
  const found = await searchSimilarChunks({
    ...options,
    minSimilarity: options.minSimilarity ?? config.rag.minSimilarity,
  });

  // Keep the best chunks that fit the prompt's context budget. The top chunk
  // is always kept, so a single long passage is never dropped entirely.
  const chunks: RetrievedChunk[] = [];
  let tokens = 0;
  for (const chunk of found) {
    tokens += estimateTokens(chunk.content) + 20; // + the <source> tags
    if (chunks.length > 0 && tokens > config.rag.maxContextTokens) break;
    chunks.push(chunk);
  }

  return {
    chunks,
    text: chunks.map((chunk, i) => formatSource(chunk, i + 1)).join("\n\n"),
    isEmpty: chunks.length === 0,
  };
}

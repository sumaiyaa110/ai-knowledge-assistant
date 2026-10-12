/** A chunk returned by vector search, with how close it is to the query. */
export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  /** Cosine similarity: 1 = same meaning, around 0 = unrelated. */
  similarity: number;
};

export type SearchOptions = {
  userId: string;
  query: string;
  /** Restrict the search to these documents (must belong to the user). */
  documentIds?: string[];
  /** Maximum chunks to return. Defaults to RAG_TOP_K. */
  limit?: number;
  /** Drop chunks scoring below this. Defaults to 0 for search, RAG_MIN_SIMILARITY for context. */
  minSimilarity?: number;
};

export type RelevantContext = {
  /** The chunks the answer may draw on, best first. `[n]` in `text` is `chunks[n - 1]`. */
  chunks: RetrievedChunk[];
  /** The chunks formatted as numbered sources for the LLM prompt. Empty if none qualified. */
  text: string;
  /** True when nothing in the user's documents was relevant enough. */
  isEmpty: boolean;
};

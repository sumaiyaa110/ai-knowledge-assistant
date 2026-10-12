// Central place for environment-driven settings. Server-side only.
export const config = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b",
    // Context window requested from the model, in tokens.
    contextTokens: Number(process.env.OLLAMA_NUM_CTX ?? 4096),
    // Longest answer the model may write, in tokens.
    maxAnswerTokens: Number(process.env.OLLAMA_MAX_ANSWER_TOKENS ?? 512),
    // How long to wait for the first token (covers model loading and prompt
    // reading, which is slow on CPU) and between later tokens.
    firstTokenTimeoutMs: Number(process.env.OLLAMA_FIRST_TOKEN_TIMEOUT_S ?? 240) * 1000,
    idleTimeoutMs: Number(process.env.OLLAMA_IDLE_TIMEOUT_S ?? 60) * 1000,
    // How long Ollama keeps the model in memory after a request.
    keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? "30m",
  },
  embeddings: {
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 384),
    // Where downloaded model files are kept.
    cacheDir: process.env.EMBEDDING_CACHE_DIR ?? "./.cache/models",
    // Set to "true" once the model is cached to forbid any network access.
    offline: process.env.EMBEDDING_OFFLINE === "true",
  },
  rag: {
    // How many chunks to retrieve for a question.
    topK: Number(process.env.RAG_TOP_K ?? 6),
    // Chunks scoring below this cosine similarity are treated as irrelevant.
    minSimilarity: Number(process.env.RAG_MIN_SIMILARITY ?? 0.3),
    // Token budgets inside the prompt. Together with the system prompt and
    // the answer they must fit in ollama.contextTokens.
    maxContextTokens: Number(process.env.RAG_MAX_CONTEXT_TOKENS ?? 1500),
    maxHistoryTokens: Number(process.env.RAG_MAX_HISTORY_TOKENS ?? 800),
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? "./uploads",
    maxBytes: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024,
    // Per-user total across all documents.
    quotaBytes: Number(process.env.STORAGE_QUOTA_MB ?? 500) * 1024 * 1024,
  },
} as const;

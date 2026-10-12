// Central place for environment-driven settings. Server-side only.
export const config = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b",
  },
  embeddings: {
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 384),
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? "./uploads",
    maxBytes: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024,
  },
} as const;

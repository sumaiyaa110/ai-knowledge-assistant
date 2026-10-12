import { config } from "@/lib/config";
import { getEmbeddingModel } from "./model";

export const EMBEDDING_BATCH_SIZE = 32;

export type EmbeddedText = {
  /** Unit-length vector, so cosine similarity equals the dot product. */
  vector: number[];
  /** Tokens the model saw for this text, including special tokens. */
  tokenCount: number;
};

/** Thrown when the embedding model cannot be loaded or run. */
export class EmbeddingError extends Error {}

async function embedBatch(texts: string[]): Promise<EmbeddedText[]> {
  const model = await getEmbeddingModel();

  // Mean pooling + L2 normalisation is how all-MiniLM-L6-v2 was trained to be used.
  const output = await model(texts, { pooling: "mean", normalize: true });
  const vectors = output.tolist() as number[][];

  const { dimensions } = config.embeddings;
  if (vectors.length !== texts.length || vectors.some((v) => v.length !== dimensions)) {
    throw new EmbeddingError(
      `Expected ${texts.length} vectors of ${dimensions} dimensions from ${config.embeddings.model}.`,
    );
  }

  const encoded = model.tokenizer(texts, { padding: true, truncation: true });
  const masks = encoded.attention_mask.tolist() as (number | bigint)[][];

  return vectors.map((vector, i) => ({
    vector,
    tokenCount: masks[i].reduce<number>((sum, bit) => sum + Number(bit), 0),
  }));
}

/**
 * Embed any number of texts, `batchSize` at a time. `onBatch` receives each
 * finished batch with the offset of its first text, so callers can store
 * results as they arrive instead of holding everything in memory.
 */
export async function embedTexts(
  texts: string[],
  onBatch?: (results: EmbeddedText[], offset: number) => Promise<void>,
  batchSize: number = EMBEDDING_BATCH_SIZE,
): Promise<EmbeddedText[]> {
  const all: EmbeddedText[] = [];
  try {
    for (let offset = 0; offset < texts.length; offset += batchSize) {
      const results = await embedBatch(texts.slice(offset, offset + batchSize));
      if (onBatch) await onBatch(results, offset);
      else all.push(...results);
    }
  } catch (error) {
    if (error instanceof EmbeddingError) throw error;
    throw new EmbeddingError("The embedding model could not be run.", { cause: error });
  }
  return all;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [result] = await embedTexts([text]);
  return result.vector;
}

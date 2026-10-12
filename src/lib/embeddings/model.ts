import path from "node:path";
import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import { config } from "@/lib/config";

// The model runs inside this Node process through ONNX Runtime. Its files are
// downloaded from the Hugging Face hub the first time it is used and cached
// on disk; after that no network access is needed.
env.cacheDir = path.resolve(config.embeddings.cacheDir);
if (config.embeddings.offline) env.allowRemoteModels = false;

// Loading takes a second or two, so keep one instance for the whole process
// (on globalThis, to survive dev hot reloads).
const globalForModel = globalThis as unknown as {
  embeddingModel?: Promise<FeatureExtractionPipeline>;
};

export function getEmbeddingModel(): Promise<FeatureExtractionPipeline> {
  if (!globalForModel.embeddingModel) {
    const loading: Promise<FeatureExtractionPipeline> = pipeline(
      "feature-extraction",
      config.embeddings.model,
      { dtype: "fp32" },
    );
    globalForModel.embeddingModel = loading;
    // A failed load (e.g. no network on first run) must not be cached forever.
    loading.catch(() => {
      if (globalForModel.embeddingModel === loading) globalForModel.embeddingModel = undefined;
    });
  }
  return globalForModel.embeddingModel;
}

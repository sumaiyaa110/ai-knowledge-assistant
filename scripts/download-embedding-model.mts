// Download the embedding model into the local cache and check that it works.
//
//   npm run embeddings:download
//
// The app does this by itself the first time a document is processed; running
// it ahead of time means the first upload is fast and works without internet.
import { config } from "@/lib/config";
import { embedQuery } from "@/lib/embeddings/embed";

const started = Date.now();
const vector = await embedQuery("Checking that the embedding model works.");

if (vector.length !== config.embeddings.dimensions) {
  console.error(
    `Unexpected vector size ${vector.length}; EMBEDDING_DIMENSIONS is ${config.embeddings.dimensions}.`,
  );
  process.exit(1);
}
console.log(
  `${config.embeddings.model} is ready (${vector.length} dimensions, loaded in ${((Date.now() - started) / 1000).toFixed(1)}s).`,
);

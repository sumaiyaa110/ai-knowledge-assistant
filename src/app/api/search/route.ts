import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { EmbeddingError } from "@/lib/embeddings/embed";
import { searchSimilarChunks } from "@/lib/rag/retrieve";

const searchSchema = z.object({
  query: z.string().trim().min(1, "Enter something to search for").max(2000),
  documentIds: z.array(z.string().min(1)).max(100).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  minSimilarity: z.number().min(-1).max(1).optional(),
});

/** Semantic search over the signed-in user's documents. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, searchSchema);
  if (response) return response;

  try {
    const results = await searchSimilarChunks({ userId: user.id, ...data });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed", error);
    return jsonError(
      error instanceof EmbeddingError
        ? "The embedding model is not available."
        : "Search failed. Please try again.",
      500,
    );
  }
}

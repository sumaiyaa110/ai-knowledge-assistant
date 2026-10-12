import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { answerQuestion } from "@/lib/chat/answer";
import { prisma } from "@/lib/database/prisma";
import { sendMessageSchema, type ChatStreamEvent } from "@/models/chat";

/**
 * Ask a question in a conversation. The reply is a stream of newline-delimited
 * JSON events (see ChatStreamEvent): the answer arrives token by token.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const conversationId = (await params).id;
  const owned = await prisma.conversation.count({ where: { id: conversationId, userId: user.id } });
  if (owned === 0) return jsonError("Conversation not found", 404);

  const { data, response } = await parseBody(request, sendMessageSchema);
  if (response) return response;

  // Aborted when the browser goes away, which also stops generation in Ollama.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  const encoder = new TextEncoder();
  const events = answerQuestion({
    userId: user.id,
    conversationId,
    question: data.content,
    signal: abort.signal,
  });

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(value satisfies ChatStreamEvent)}\n`));
      } catch (error) {
        console.error("Chat stream failed", error);
        const failure: ChatStreamEvent = {
          type: "error",
          code: "failed",
          error: "Something went wrong while answering. Please try again.",
        };
        controller.enqueue(encoder.encode(`${JSON.stringify(failure)}\n`));
        controller.close();
      }
    },
    async cancel() {
      abort.abort();
      // Let the generator run to its end so a partial answer is still saved.
      try {
        for (;;) if ((await events.next()).done) break;
      } catch {
        // Already reported inside the generator.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

import type { ApiError } from "@/models/auth";
import type { ChatStreamEvent } from "@/models/chat";
import { describeHttpFailure } from "./client";

/**
 * Send a question and call `onEvent` for every event of the streamed reply.
 * Resolves when the stream ends. Network failures and non-streaming error
 * responses are delivered as an `error` event, so callers handle one shape.
 */
export async function streamAnswer(
  conversationId: string,
  content: string,
  onEvent: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const fail = (error: string) => onEvent({ type: "error", code: "failed", error });

  let response: Response;
  try {
    response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch {
    if (!signal.aborted) fail("Could not reach the server.");
    return;
  }

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    fail(body?.fieldErrors?.content?.[0] ?? body?.error ?? describeHttpFailure(response.status));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) onEvent(JSON.parse(line) as ChatStreamEvent);
      }
    }
  } catch {
    if (!signal.aborted) fail("The connection was lost while the answer was being written.");
  }
}

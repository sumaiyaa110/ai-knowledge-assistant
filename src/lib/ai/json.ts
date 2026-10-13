import type { z } from "zod";
import { OllamaError, completeChat, type ChatMessage } from "./ollama";

type CompleteJsonOptions<T> = {
  messages: ChatMessage[];
  /** JSON schema passed to Ollama, which constrains the shape of the reply. */
  format: object;
  /** Checks what the JSON schema cannot (lengths, value ranges, extra rules). */
  schema: z.ZodType<T>;
  maxTokens: number;
  temperature?: number;
  /** Extra attempts after an unusable reply. Connection problems are not retried. */
  retries?: number;
};

/** The model replied, but not with something usable, even after retrying. */
export class InvalidModelOutputError extends Error {}

/**
 * Ask the model for JSON and validate it. A reply that is not valid JSON or
 * fails validation is retried with a slightly higher temperature, so the
 * model does not repeat the same mistake word for word.
 */
export async function completeJson<T>({
  messages,
  format,
  schema,
  maxTokens,
  temperature = 0.3,
  retries = 1,
}: CompleteJsonOptions<T>): Promise<T> {
  let lastProblem = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    // OllamaError (unreachable, timeout, missing model) propagates: retrying
    // immediately would not help and would only make the user wait longer.
    const reply = await completeChat({
      messages,
      format,
      maxTokens,
      temperature: temperature + attempt * 0.2,
    });

    try {
      const parsed = schema.safeParse(JSON.parse(reply));
      if (parsed.success) return parsed.data;
      lastProblem = parsed.error.issues[0]?.message ?? "validation failed";
    } catch {
      lastProblem = "reply was not valid JSON (possibly cut off)";
    }
  }
  throw new InvalidModelOutputError(lastProblem);
}

export { OllamaError };

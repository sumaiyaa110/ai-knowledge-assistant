import { config } from "@/lib/config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OllamaErrorCode = "unavailable" | "model_missing" | "timeout" | "aborted" | "failed";

/** A failure talking to Ollama, with a message suitable for showing to the user. */
export class OllamaError extends Error {
  constructor(
    public code: OllamaErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

const USER_MESSAGES: Record<OllamaErrorCode, string> = {
  unavailable: "The local AI model is not reachable. Make sure Ollama is running, then try again.",
  model_missing: `The model "${config.ollama.model}" is not installed in Ollama. Run: ollama pull ${config.ollama.model}`,
  timeout: "The local AI model took too long to respond. Please try again.",
  aborted: "The response was stopped.",
  failed: "The local AI model returned an error. Please try again.",
};

const fail = (code: OllamaErrorCode, cause?: unknown) =>
  new OllamaError(code, USER_MESSAGES[code], { cause });

type ChatOptions = {
  messages: ChatMessage[];
  /** Cancels the request, e.g. when the browser disconnects. */
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  /** A JSON schema the reply must conform to (Ollama structured output). */
  format?: object;
};

type OllamaChunk = { message?: { content?: string }; done?: boolean; error?: string };

/**
 * Open a streaming chat request. Combines the caller's abort signal with two
 * timeouts: a long one until the first token (model load + prompt reading)
 * and a shorter one between tokens.
 */
async function openChat(options: ChatOptions, stream: boolean) {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);
  };
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) controller.abort();

  const cleanup = () => {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  };
  /** Translate a low-level failure into the right OllamaError. */
  const classify = (error: unknown) => {
    if (error instanceof OllamaError) return error;
    if (timedOut) return fail("timeout", error);
    if (options.signal?.aborted) return fail("aborted", error);
    return fail("unavailable", error);
  };

  arm(config.ollama.firstTokenTimeoutMs);

  let response: Response;
  try {
    response = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ollama.model,
        messages: options.messages,
        stream,
        format: options.format,
        keep_alive: config.ollama.keepAlive,
        options: {
          temperature: options.temperature ?? 0.2,
          num_ctx: config.ollama.contextTokens,
          num_predict: options.maxTokens ?? config.ollama.maxAnswerTokens,
        },
      }),
    });
  } catch (error) {
    cleanup();
    throw classify(error);
  }

  if (!response.ok || !response.body) {
    cleanup();
    const detail = await response.text().catch(() => "");
    throw response.status === 404 || /not found/i.test(detail)
      ? fail("model_missing", detail)
      : fail("failed", detail);
  }

  return { body: response.body, arm, cleanup, classify };
}

/** Stream an answer token by token. Throws OllamaError on any failure. */
export async function* streamChat(options: ChatOptions): AsyncGenerator<string> {
  const { body, arm, cleanup, classify } = await openChat(options, true);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      // Ollama sends one JSON object per line; a network chunk may hold
      // several lines or end in the middle of one.
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as OllamaChunk;
        if (chunk.error) throw fail("failed", chunk.error);
        if (chunk.message?.content) {
          arm(config.ollama.idleTimeoutMs);
          yield chunk.message.content;
        }
        if (chunk.done) return;
      }
    }
  } catch (error) {
    throw classify(error);
  } finally {
    cleanup();
    await reader.cancel().catch(() => {});
  }
}

/** A complete, non-streamed reply. Used for short structured tasks. */
export async function completeChat(options: ChatOptions): Promise<string> {
  const { body, cleanup, classify } = await openChat(options, false);
  try {
    const data = (await new Response(body).json()) as OllamaChunk;
    if (data.error) throw fail("failed", data.error);
    return data.message?.content ?? "";
  } catch (error) {
    throw classify(error);
  } finally {
    cleanup();
  }
}

export type ServiceStatus = { ok: boolean; detail: string };

/** Is Ollama running, and does it have the configured model? */
export async function checkOllama(): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, detail: `Ollama responded with ${res.status}` };
    const data = (await res.json()) as { models?: { name: string }[] };
    const installed = data.models?.some((m) => m.name === config.ollama.model);
    return installed
      ? { ok: true, detail: `Running, ${config.ollama.model} installed` }
      : { ok: false, detail: `Running, but run: ollama pull ${config.ollama.model}` };
  } catch {
    return { ok: false, detail: `Not reachable at ${config.ollama.baseUrl}` };
  }
}

import type { ApiError } from "@/models/auth";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: Record<string, string[]> };

/** Browser-side JSON request that always resolves to a typed result. */
export async function sendJson<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };

    const failure = json as ApiError | null;
    return {
      ok: false,
      error: failure?.error ?? `Request failed (${res.status})`,
      fieldErrors: failure?.fieldErrors ?? {},
    };
  } catch {
    return { ok: false, error: "Could not reach the server", fieldErrors: {} };
  }
}

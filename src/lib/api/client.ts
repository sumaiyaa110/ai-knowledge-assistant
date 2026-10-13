import type { ApiError } from "@/models/auth";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: Record<string, string[]> };

/**
 * Message for a response that carried no error text of its own. A bare 5xx
 * almost always means the server lost its database connection.
 */
export function describeHttpFailure(status: number): string {
  if (status >= 500) {
    return "The server could not complete the request. Check that the database is running (npm run db:up), then try again.";
  }
  if (status === 401) return "Your session has ended. Sign in again.";
  return `Request failed (${status})`;
}

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
      error: failure?.error ?? describeHttpFailure(res.status),
      fieldErrors: failure?.fieldErrors ?? {},
    };
  } catch {
    return { ok: false, error: "Could not reach the server", fieldErrors: {} };
  }
}

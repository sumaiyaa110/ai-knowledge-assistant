// Small in-memory limiter for sign-in attempts. It resets when the server
// restarts, which is fine for a single local process.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

/** Returns seconds to wait if the key is currently blocked, otherwise 0. */
export function retryAfterSeconds(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  if (entry.resetAt <= Date.now()) {
    attempts.delete(key);
    return 0;
  }
  return entry.count >= MAX_ATTEMPTS ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

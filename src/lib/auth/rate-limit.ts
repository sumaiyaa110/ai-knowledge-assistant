// Small in-memory attempt limiters for the authentication endpoints. They
// reset when the server restarts, which is fine for a single local process.

type Entry = { count: number; resetAt: number };

const PRUNE_ABOVE = 5000;

export type RateLimiter = {
  /** Seconds to wait if the key is currently blocked, otherwise 0. */
  retryAfterSeconds(key: string): number;
  /** Count one attempt against the key. */
  record(key: string): void;
  /** Forget the key, e.g. after a successful sign-in. */
  clear(key: string): void;
};

/** Allow `max` recorded attempts per key within `windowMs`. */
export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const attempts = new Map<string, Entry>();

  // Keep the map from growing without bound if many different keys are tried.
  const prune = (now: number) => {
    if (attempts.size <= PRUNE_ABOVE) return;
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  };

  return {
    retryAfterSeconds(key) {
      const entry = attempts.get(key);
      if (!entry) return 0;
      const now = Date.now();
      if (entry.resetAt <= now) {
        attempts.delete(key);
        return 0;
      }
      return entry.count >= max ? Math.ceil((entry.resetAt - now) / 1000) : 0;
    },
    record(key) {
      const now = Date.now();
      const entry = attempts.get(key);
      if (!entry || entry.resetAt <= now) {
        prune(now);
        attempts.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count += 1;
      }
    },
    clear(key) {
      attempts.delete(key);
    },
  };
}

const MINUTES = 60 * 1000;

// Kept on globalThis so development hot reloads do not reset the counters.
const globalForLimiters = globalThis as unknown as {
  authLimiters?: {
    loginByEmail: RateLimiter;
    loginByIp: RateLimiter;
    registrationByIp: RateLimiter;
    passwordChangeByUser: RateLimiter;
  };
};

export const limiters = (globalForLimiters.authLimiters ??= {
  // Guessing one account's password. Keyed by the email alone: the client's
  // address comes from a header the client controls, so it must not be part
  // of this key or the limit could be sidestepped by changing the header.
  loginByEmail: createRateLimiter(8, 15 * MINUTES),
  // Trying one password against many accounts from one place.
  loginByIp: createRateLimiter(40, 15 * MINUTES),
  // Mass account creation. Counts every attempt, successful or not.
  registrationByIp: createRateLimiter(10, 60 * MINUTES),
  // Guessing the current password from an already signed-in session.
  passwordChangeByUser: createRateLimiter(5, 15 * MINUTES),
});

/**
 * Best-effort client address. Without a trusted reverse proxy this header can
 * be forged, so it is only used for the coarse per-address limits, never as
 * the only protection.
 */
export function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export function tooManyAttemptsMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

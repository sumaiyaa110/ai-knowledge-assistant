import { Prisma } from "@prisma/client";

// P1001/P1002: server unreachable or timed out. P1017: connection closed.
// P2024: no free connection in the pool, which is what a stalled database looks like.
const UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);

/** True when a query failed because PostgreSQL cannot be reached, not because of the query. */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && UNAVAILABLE_CODES.has(error.code)
  );
}

// Kept free of Node-only imports: middleware (edge runtime) uses this file.

export const SESSION_COOKIE = "aika_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Pages that require a signed-in user. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/documents",
  "/chat",
  "/tools",
  "/profile",
];

/** Pages a signed-in user is redirected away from. */
export const AUTH_PAGES = ["/login", "/register"];

/** API routes callable without a session. Every other /api route needs one. */
export const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/health",
];

export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

/** Only allow same-site relative paths as post-login redirect targets. */
export function safeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  return path;
}

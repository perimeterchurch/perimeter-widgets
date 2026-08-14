/**
 * Paths reachable WITHOUT a session, matched exactly. These are real Next pages
 * (the SPA rewrite in `next.config.ts` is `afterFiles`, so they win over the
 * fallback) plus the favicon.
 */
const PUBLIC_PATHS = new Set(['/health', '/sign-in', '/access-denied', '/favicon.ico']);

/**
 * Prefixes reachable without a session. The trailing slash is load-bearing:
 * these MUST match a complete path segment, never a bare substring.
 *
 * `/api/` — every route under it resolves access itself via `resolveAccess` /
 * `requireAdmin`, so the wall would be redundant. It MUST stay exempt for a
 * second reason now: `/api/session-check` is what the wall consults, and gating
 * it behind the wall would be circular.
 * `/_next/` — framework internals. `/assets/` — the embedded studio build.
 */
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/assets/'];

/**
 * Is this path exempt from the login wall?
 *
 * A previous version expressed these exemptions as unanchored lookaheads in the
 * middleware matcher (the old `(?!api|assets|health|signin|…)`), which matched bare
 * PREFIXES — so `/apifoo`, `/healthz`, and `/sign-inx` skipped the gate while the
 * `next.config.ts` rewrite (anchored on `api/` and `assets/`) still served them
 * index.html. Any unauthenticated visitor got the whole studio from one crafted
 * URL. Exact-match + segment-anchored prefixes is why that cannot recur; the
 * complement property is pinned in `public-paths.test.ts`.
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

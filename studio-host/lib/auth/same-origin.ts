/**
 * Belt-and-suspenders CSRF check for state-changing shell requests.
 *
 * Ported from the helpdesk BFF (`src/lib/proxy/csrf.ts`) — same reasoning, same
 * behaviour. Better Auth's session cookie is `SameSite=Lax`, which already
 * blocks the common cross-site POST attack: modern browsers won't send the
 * cookie on a cross-origin form submission. This adds a server-side guard so the
 * route still rejects the request if SameSite enforcement falters (an outdated
 * browser, a rogue extension that strips the SameSite hint).
 *
 * For non-GET methods, the request must carry an `Origin` (or `Referer`
 * fallback) whose origin matches `BETTER_AUTH_URL`. Same-origin requests from
 * the studio always do; cross-site POSTs don't.
 *
 * GET / HEAD / OPTIONS skip the check — they're either safe by HTTP semantics or
 * the CORS preflight that lets the browser decide whether to send the real
 * request.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function expectedOrigin(): string | null {
  const raw = process.env.BETTER_AUTH_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the request passes the cross-origin check (or doesn't need
 * one). Returns `false` when it looks cross-site and the caller should reject
 * with 403.
 *
 * Falls open when `BETTER_AUTH_URL` isn't configured — Better Auth itself is
 * non-functional without it, so a missing value surfaces as a broken sign-in
 * long before this check matters.
 */
export function isSameOriginRequest(request: { method: string; headers: Headers }): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const expected = expectedOrigin();
  if (!expected) return true;

  const origin = originOf(request.headers.get('origin'));
  if (origin) return origin === expected;

  // Some browsers omit Origin on same-origin POSTs; fall back to Referer.
  const referer = originOf(request.headers.get('referer'));
  if (referer) return referer === expected;

  // No Origin and no Referer on a state-changing request is suspicious — every
  // studio fetch rides the same-origin cookie and browsers attach Origin to
  // those automatically. Reject.
  return false;
}

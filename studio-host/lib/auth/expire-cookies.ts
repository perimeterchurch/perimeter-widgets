import { AUTH_COOKIE_PREFIX, SECURE_COOKIE_PREFIX, SIGNED_OUT_COOKIE } from './config';

/**
 * Which cookies sign-out must expire, derived from what the request actually sent.
 *
 * THE BUG THIS FIXES
 * ------------------
 * `/api/auth/logout` used to delegate session clearing entirely to
 * `auth.api.signOut({ asResponse: true })` and copy whatever `Set-Cookie` headers
 * came back. Observed 2026-08-14: that call can return **no `Set-Cookie` at all**,
 * so the browser kept `studio.session_token` and the user was never signed out —
 * they'd "log out", return to the studio, and walk straight in with no sign-in
 * page, which reads exactly like sign-out doing nothing.
 *
 * WHY DERIVE THE NAMES FROM THE REQUEST
 * -------------------------------------
 * Rather than hardcode a list, we expire every cookie the request carries whose
 * name belongs to this shell's auth. That handles, without having to predict any
 * of it:
 *
 *   - all four Better Auth cookies — `session_token`, `session_data` (the 1h
 *     cookie cache, which alone can keep a session resolving), `account_data`
 *     (the MP access/refresh/id tokens), and `dont_remember`;
 *   - CHUNKED cookies: `account_data` holds three MP tokens and gets split into
 *     `account_data.0`, `.1`, … when it exceeds the per-cookie size limit, so a
 *     hardcoded `account_data` would leave the chunks — and the tokens — behind;
 *   - the `__Secure-` name prefix Better Auth adds on https, so the same code is
 *     correct locally and in production;
 *   - `studio.impersonate`, which must not survive a sign-out either.
 *
 * The signed-out cookie is excluded because the caller sets it on the very same
 * response.
 */
export function authCookieNamesToExpire(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader) return [];

  const names = new Set<string>();
  for (const pair of cookieHeader.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (!name) continue;

    const bare = name.startsWith(SECURE_COOKIE_PREFIX)
      ? name.slice(SECURE_COOKIE_PREFIX.length)
      : name;

    // `studio.` — the dot matters: it keeps this from matching a hypothetical
    // `studiofoo` cookie belonging to something else on the same host.
    if (!bare.startsWith(`${AUTH_COOKIE_PREFIX}.`)) continue;
    if (bare === SIGNED_OUT_COOKIE) continue;

    names.add(name);
  }
  return [...names];
}

/** Is this an `__Secure-`-prefixed name? Such cookies are only accepted by the
 * browser when the `Secure` attribute is set, including when expiring them. */
export function requiresSecureAttribute(cookieName: string): boolean {
  return cookieName.startsWith(SECURE_COOKIE_PREFIX);
}

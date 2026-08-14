/**
 * Cookie set by `/api/auth/logout` and read by `/sign-in`, which uses it to tell
 * a visitor they have just been signed out rather than showing a bare prompt.
 *
 * This used to be the query parameter `?signedout=1`, and it carried more weight
 * then: the sign-in page auto-started the OAuth redirect, and the parameter was
 * the only thing suppressing it — so anything that dropped the query string (a
 * refresh from history, a bookmark, the back button) silently signed the user
 * back in. The auto-redirect is gone now, matching helpdesk, so this cookie only
 * affects COPY. It stays a cookie because copy that survives a refresh is still
 * better than copy that doesn't.
 *
 * httpOnly (only the server reads it) and short-lived: ten minutes covers the
 * redirect chain through Ministry Platform and a little hesitation, after which
 * the page reads as an ordinary sign-in prompt again.
 */
export const SIGNED_OUT_COOKIE = 'studio.signedout';
export const SIGNED_OUT_MAX_AGE_SECONDS = 600;

/**
 * Better Auth's `advanced.cookiePrefix`. Every cookie this shell's auth issues is
 * named `<prefix>.<something>`, optionally behind the `__Secure-` prefix that
 * Better Auth adds whenever the base URL is https (so: prod yes, local no).
 *
 * Imported by `better-auth.ts` so the configured prefix and the sign-out sweep in
 * `expire-cookies.ts` cannot drift apart — if they did, sign-out would silently
 * stop clearing the session.
 */
export const AUTH_COOKIE_PREFIX = 'studio';

/** Better Auth's `SECURE_COOKIE_PREFIX`, part of the cookie NAME when present. */
export const SECURE_COOKIE_PREFIX = '__Secure-';

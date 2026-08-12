import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isPublicPath } from '@/lib/auth/public-paths';

/**
 * The wall. Presence-check the `studio.session_token` cookie (Better Auth's
 * canonical lookup — handles the `__Secure-` prefix in prod and chunked
 * cookies); no cookie → redirect to /signin. This is a presence check, not a
 * signature/expiry verification — the OAuth callback is where a session is only
 * ever issued to an authorized user (role gate, Task 1.1), so "has a session"
 * ⇒ "was authorized". Every /api route separately verifies the session for
 * real, so a forged cookie yields page chrome and no data. Adapted from the
 * Knowledge Base middleware.
 *
 * Which paths skip the wall lives in `lib/auth/public-paths.ts` — as exact
 * matches and segment-anchored prefixes, unit-tested against the SPA rewrite it
 * must stay complementary to. It is deliberately NOT expressed in the matcher
 * below: lookaheads there match bare prefixes, which is what let `/apifoo` and
 * `/healthz` serve the whole studio unauthenticated.
 */
export function middleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) return;

  const sessionToken = getSessionCookie(req, { cookiePrefix: 'studio' });
  if (sessionToken) return;
  return NextResponse.redirect(new URL('/signin', req.url));
}

export const config = {
  // Broad by design — the real decision is `isPublicPath`. This only keeps the
  // middleware off Next's own static output for performance.
  matcher: ['/((?!_next/static|_next/image).*)'],
};

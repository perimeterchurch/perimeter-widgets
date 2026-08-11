import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * The wall. Presence-check the `studio.session_token` cookie (Better Auth's
 * canonical lookup — handles the `__Secure-` prefix in prod and chunked
 * cookies); no cookie → redirect to /signin. This is a presence check, not a
 * signature/expiry verification — the OAuth callback is where a session is only
 * ever issued to an authorized user (role gate, Task 1.1), so "has a session"
 * ⇒ "was authorized". Adapted from the Knowledge Base middleware.
 *
 * The matcher lets through: Next internals (`_next/*`), the auth API
 * (`/api/*`), the studio's built assets (`/assets/*`), `favicon.ico`, the
 * health check, and the unauthenticated pages `/signin` + `/unauthorized`.
 * Everything else (the studio itself and its client routes) requires a session.
 */
export function middleware(req: NextRequest) {
  const sessionToken = getSessionCookie(req, { cookiePrefix: 'studio' });
  if (sessionToken) return;
  return NextResponse.redirect(new URL('/signin', req.url));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon\\.ico|health|signin|unauthorized).*)',
  ],
};

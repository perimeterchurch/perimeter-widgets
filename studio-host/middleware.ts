import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/auth/public-paths';

/**
 * The wall. For anything that isn't a public path, ask `/api/session-check`
 * whether this request may proceed, forwarding the incoming cookies, and route
 * on its answer:
 *
 *   200 → proceed          401 → /sign-in          403 → /access-denied
 *
 * WHY A SUBREQUEST
 * ----------------
 * This used to be a cookie-PRESENCE check — `getSessionCookie()` and nothing
 * more, with a comment conceding it was "not a signature/expiry verification".
 * The consequence was that an expired or hand-crafted `studio.session_token`
 * still got you the whole studio shell; only the `/api/*` routes refused you, so
 * the studio rendered normally and its widgets came up empty. Verifying for real
 * needs the server secret (and here, a perimeter-api round-trip for live MP
 * roles), which is not work for edge middleware — so the verification lives in a
 * Node route and middleware delegates to it. Helpdesk reaches the same place from
 * the other direction: it has no middleware at all and gates inside a server
 * component (`AuthWrapper`), which it can do because it renders its own pages.
 * The studio serves a static Vite bundle, so the gate has to sit in front.
 *
 * A 403 is distinct from a 401 on purpose: a signed-in user whose MP roles don't
 * admit them should see the "access not permitted" page, not be bounced through
 * sign-in again to arrive at the same refusal.
 *
 * Which paths skip the wall lives in `lib/auth/public-paths.ts` — as exact
 * matches and segment-anchored prefixes, unit-tested against the SPA rewrite it
 * must stay complementary to. It is deliberately NOT expressed in the matcher
 * below: lookaheads there match bare prefixes, which is what let `/apifoo` and
 * `/healthz` serve the whole studio unauthenticated.
 */
export async function middleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) return;

  const cookie = req.headers.get('cookie') ?? '';
  // No cookies at all can't be a valid session — skip the subrequest.
  if (!cookie) return redirectTo('/sign-in', req);

  let status: number;
  try {
    const res = await fetch(new URL('/api/session-check', req.nextUrl.origin), {
      headers: { cookie, accept: 'application/json' },
      cache: 'no-store',
    });
    status = res.status;
  } catch {
    // The verifier is unreachable — that's this deployment being broken, not a
    // verdict on the user. `/api/session-check` already falls back to the signed
    // sign-in claim when only perimeter-api is down, so reaching this branch
    // means the shell itself can't serve its own route. Fail CLOSED: a wall that
    // opens when it breaks is not a wall.
    return redirectTo('/sign-in', req);
  }

  if (status === 403) return redirectTo('/access-denied', req);
  if (status !== 200) return redirectTo('/sign-in', req);
  return;
}

function redirectTo(pathname: string, req: NextRequest) {
  const url = new URL(pathname, req.url);
  // Preserve the page the user was trying to reach so the sign-in page can send
  // them back there after the MP OAuth round-trip (it reads `callbackUrl`).
  // Without this, every gated deep link lands on `/` post-login. Only carry it
  // to sign-in — /access-denied is a terminal page, not a way back in.
  if (pathname === '/sign-in') {
    url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Broad by design — the real decision is `isPublicPath`. This only keeps the
  // middleware off Next's own static output for performance.
  matcher: ['/((?!_next/static|_next/image).*)'],
};

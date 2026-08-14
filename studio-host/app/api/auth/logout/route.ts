import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { buildEndSessionUrl } from '@/lib/auth/end-session';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { SIGNED_OUT_COOKIE, SIGNED_OUT_MAX_AGE_SECONDS } from '@/lib/auth/config';
import { authCookieNamesToExpire, requiresSecureAttribute } from '@/lib/auth/expire-cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout — the whole sign-out, in one place.
 *
 * Sign-out used to be a bare `POST /api/auth/sign-out` from the client, which
 * cleared the studio's own cookies and stopped there. Three things were left
 * behind, and this route deals with all of them:
 *
 *   1. MP's SSO SESSION survived, so signing in again completed silently and it
 *      looked like sign-out hadn't worked. We now return the MP
 *      `end_session_endpoint` URL for the browser to visit.
 *   2. The IMPERSONATION COOKIE survived — an admin could "sign out", sign back
 *      in, and still be impersonating whoever they were before. It is named
 *      `studio.impersonate`, so the cookie sweep below now covers it.
 *   3. Signed-out state lived in `?signedout=1`, so anything that dropped the
 *      query string re-armed the automatic SSO bounce. Now a cookie.
 *
 * The BRIDGED MP TOKEN in `localStorage` is the client's to clear (the server
 * can't touch it) — `AccountMenu` does that before calling this route. It is
 * cleared regardless of whether this request succeeds.
 *
 * Returns `{ redirectTo }` rather than issuing a redirect: the caller is a
 * `fetch`, and a 3xx to a cross-origin IdP from `fetch` is not usefully
 * followable. The client assigns `window.location` to it.
 */
export async function POST(req: Request) {
  const hdrs = await nextHeaders();

  if (!isSameOriginRequest({ method: req.method, headers: hdrs })) {
    return NextResponse.json({ error: 'cross_origin' }, { status: 403 });
  }

  // Grab the ID token BEFORE signing out — afterwards the account cookie that
  // holds it is gone. Best-effort: no session, or no stored ID token, just means
  // MP shows its own interstitial instead of returning here.
  let idToken: string | undefined;
  let email = '';
  try {
    const session = await auth.api.getSession({ headers: hdrs });
    if (session) {
      email = session.user.email ?? '';
      const token = await auth.api.getAccessToken({
        body: { providerId: 'ministryplatform', userId: session.user.id },
        headers: hdrs,
      });
      idToken = token?.idToken;
    }
  } catch {
    /* proceed with a local sign-out regardless */
  }

  // Ask Better Auth to sign out too — in a DB-backed setup this is what revokes
  // the session server-side. Best-effort: it is NOT relied on to clear cookies
  // (see below), so a throw here is not fatal.
  try {
    await auth.api.signOut({ headers: hdrs, asResponse: true });
  } catch {
    /* the explicit cookie sweep below is what actually ends the session */
  }

  const origin = process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;
  const redirectTo =
    (await buildEndSessionUrl(idToken, new URL('/sign-in', origin).toString())) ?? '/sign-in';

  const expired = authCookieNamesToExpire(hdrs.get('cookie'));

  console.log(
    JSON.stringify({
      event: 'auth.logout',
      by: email,
      endedMpSession: redirectTo !== '/sign-in',
      // Without an id_token_hint, MP cannot tell which session to end — so if
      // this is ever false while a real user signs out, MP's SSO cookie survives
      // and the next sign-in completes silently. Logged because that failure is
      // otherwise invisible from this side.
      hasIdTokenHint: Boolean(idToken),
      expiredCookies: expired,
    }),
  );

  const res = NextResponse.json({ redirectTo });

  // Expire every auth cookie the request carried. This — not `signOut` above —
  // is what ends the session: `signOut` was observed returning no Set-Cookie at
  // all, which left `studio.session_token` in place and made sign-out a no-op.
  for (const name of expired) {
    res.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      // `__Secure-`-prefixed cookies are rejected by the browser unless the
      // Secure attribute is set — including on the response that expires them.
      secure: requiresSecureAttribute(name) || process.env.NODE_ENV === 'production',
    });
  }

  // Tell /sign-in a sign-out just happened, so it says so.
  res.cookies.set(SIGNED_OUT_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SIGNED_OUT_MAX_AGE_SECONDS,
  });

  return res;
}

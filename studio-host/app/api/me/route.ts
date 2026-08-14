import { NextResponse } from 'next/server';
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers';
import { resolveAccess } from '@/lib/auth/access';
import { readTarget } from '@/lib/impersonation/cookie';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/me — lets the studio gate its admin-only UI and learn the current
 * impersonation state. Returns `{ authenticated: false }` (200) when there's no
 * session so the caller can probe harmlessly. Impersonation state is surfaced
 * only to Administrators (the only role that may impersonate).
 *
 * `isAdmin` comes from LIVE MP roles (`resolveAccess`), not from the `roles` CSV
 * frozen into the session cookie at sign-in — so the admin UI disappears within
 * about a minute of the role being revoked in MP, instead of whenever the cookie
 * happens to expire.
 *
 * A caller whose roles no longer admit them reads as `{ authenticated: false }`:
 * from the studio's point of view they have no usable session, and the wall will
 * send them to /unauthorized on their next navigation anyway.
 */
export async function GET() {
  const access = await resolveAccess(await nextHeaders());
  if (access.status !== 'ok') {
    return NextResponse.json({ authenticated: false });
  }

  let impersonating: { targetUserId: number } | null = null;
  if (access.isAdmin) {
    const cookieStore = await nextCookies();
    const target = readTarget(cookieStore.get(IMPERSONATE_COOKIE)?.value);
    if (target) impersonating = { targetUserId: target };
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: access.isAdmin,
    impersonating,
    user: { name: access.name, email: access.email },
  });
}

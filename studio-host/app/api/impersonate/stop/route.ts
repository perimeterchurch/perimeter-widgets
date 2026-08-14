import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/impersonate/stop — clears the impersonation cookie.
 *
 * Requires only a valid session, not an admin role: any signed-in user may clear
 * their own impersonation state, and STOPPING is always the safe direction. That
 * matters for the revoked-admin case — a user who has just lost role 2 must still
 * be able to get out of impersonation, which `requireAdmin` would refuse.
 */
export async function POST(req: Request) {
  const hdrs = await nextHeaders();

  if (!isSameOriginRequest({ method: req.method, headers: hdrs })) {
    return NextResponse.json({ error: 'cross_origin' }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  console.log(JSON.stringify({ event: 'impersonate.stop', by: session.user.email }));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}

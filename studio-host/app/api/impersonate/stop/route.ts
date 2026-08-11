import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

/**
 * POST /api/impersonate/stop — clears the impersonation cookie. Requires a
 * session; any signed-in studio user may clear their own impersonation state.
 */
export async function POST() {
  const hdrs = await nextHeaders();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  console.log(JSON.stringify({ event: 'impersonate.stop', by: session.user.email }));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}

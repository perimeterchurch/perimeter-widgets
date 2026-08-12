import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { isAdministrator } from '@/lib/impersonation/admin';
import { signTarget } from '@/lib/impersonation/cookie';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

/**
 * POST /api/impersonate/start  { targetUserId }
 *
 * Admin-only (MP role 2). Sets the signed httpOnly impersonation cookie so the
 * data proxy forwards subsequent gated-widget reads on behalf of the target.
 */
export async function POST(req: Request) {
  const hdrs = await nextHeaders();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!isAdministrator((session.user as { roles?: string | null }).roles)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { targetUserId?: unknown } | null;
  const targetUserId = Number(body?.targetUserId);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
  }

  console.log(
    JSON.stringify({
      event: 'impersonate.start',
      by: session.user.email,
      target: targetUserId,
    }),
  );

  const res = NextResponse.json({ ok: true, targetUserId });
  res.cookies.set(IMPERSONATE_COOKIE, signTarget(targetUserId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}

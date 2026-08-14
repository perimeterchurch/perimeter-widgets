import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { requireAdmin } from '@/lib/auth/access';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { signTarget } from '@/lib/impersonation/cookie';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/impersonate/start  { targetUserId }
 *
 * Admin-only (MP role 2), checked against LIVE MP roles — an admin whose role was
 * revoked can no longer start impersonating, where before the check read a
 * `roles` CSV frozen into their session cookie at sign-in.
 *
 * Sets the signed httpOnly impersonation cookie so the data proxy forwards
 * subsequent gated-widget reads on behalf of the target.
 */
export async function POST(req: Request) {
  const hdrs = await nextHeaders();

  if (!isSameOriginRequest({ method: req.method, headers: hdrs })) {
    return NextResponse.json({ error: 'cross_origin' }, { status: 403 });
  }

  const gate = await requireAdmin(hdrs);
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as { targetUserId?: unknown } | null;
  const targetUserId = Number(body?.targetUserId);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
  }

  console.log(
    JSON.stringify({
      event: 'impersonate.start',
      by: gate.access.email,
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

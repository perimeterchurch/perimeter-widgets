import { NextResponse } from 'next/server';
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { isAdministrator } from '@/lib/impersonation/admin';
import { readTarget } from '@/lib/impersonation/cookie';
import { IMPERSONATE_COOKIE } from '@/lib/impersonation/config';

/**
 * GET /api/me — lets the studio gate its admin-only UI and learn the current
 * impersonation state. Returns `{ authenticated: false }` (200) when there's no
 * session so the caller can probe harmlessly. Impersonation state is surfaced
 * only to Administrators (the only role that may impersonate).
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const isAdmin = isAdministrator((session.user as { roles?: string | null }).roles);

  let impersonating: { targetUserId: number } | null = null;
  if (isAdmin) {
    const cookieStore = await nextCookies();
    const target = readTarget(cookieStore.get(IMPERSONATE_COOKIE)?.value);
    if (target) impersonating = { targetUserId: target };
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin,
    impersonating,
    user: { name: session.user.name, email: session.user.email },
  });
}

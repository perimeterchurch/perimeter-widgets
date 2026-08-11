import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';

/**
 * Returns the signed-in user's Ministry Platform access token so the studio can
 * bridge it into the widgets' localStorage auth (`mpp-widgets_AuthToken`) — the
 * same key WordPress populates in production. Requires a valid shell session
 * (this route is under /api/, which the middleware gate excludes, so it guards
 * itself). Token retrieval mirrors KB's data proxy: `auth.api.getAccessToken`
 * reads (and, via the offline_access refresh token, refreshes) the MP token
 * stored on the Better Auth account.
 */
export async function GET() {
  const hdrs = await nextHeaders();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: 'ministryplatform', userId: session.user.id },
      headers: hdrs,
    });
    if (!result?.accessToken) {
      return NextResponse.json({ error: 'no_token' }, { status: 404 });
    }
    const exp = (result as { accessTokenExpiresAt?: Date | string | null }).accessTokenExpiresAt;
    const expiresAt = exp instanceof Date ? exp.toISOString() : (exp ?? null);
    return NextResponse.json({ token: result.accessToken, expiresAt });
  } catch {
    return NextResponse.json({ error: 'no_token' }, { status: 404 });
  }
}

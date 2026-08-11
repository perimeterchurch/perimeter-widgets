import { NextResponse } from 'next/server';
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers';
import { auth } from '@/lib/auth/better-auth';
import { isAdministrator } from '@/lib/impersonation/admin';
import { readTarget } from '@/lib/impersonation/cookie';
import {
  IMPERSONATE_COOKIE,
  isAllowedProxyPath,
  perimeterApiUrl,
} from '@/lib/impersonation/config';

/**
 * GET /api/impersonate/data/<whitelisted path>
 *
 * Admin-only (MP role 2) read proxy. Reads the impersonation target from the
 * signed cookie and forwards a whitelisted perimeter-api GET with the service
 * key + `x-on-behalf-of-user`, so the gated widgets render the target's data.
 * Read-only, whitelisted paths only — impersonation can never drive a write.
 */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const hdrs = await nextHeaders();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!isAdministrator((session.user as { roles?: string | null }).roles)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cookieStore = await nextCookies();
  const target = readTarget(cookieStore.get(IMPERSONATE_COOKIE)?.value);
  if (!target) {
    return NextResponse.json({ error: 'not_impersonating' }, { status: 409 });
  }

  const { path } = await params;
  const joined = path.join('/');
  if (!isAllowedProxyPath(joined)) {
    return NextResponse.json({ error: 'path_not_allowed' }, { status: 403 });
  }

  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const search = new URL(req.url).search;
  const url = `${perimeterApiUrl()}/api/${joined}${search}`;
  console.log(
    JSON.stringify({
      event: 'impersonate.proxy',
      by: session.user.email,
      target,
      path: joined,
    }),
  );

  const upstream = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'x-on-behalf-of-user': String(target),
      accept: 'application/json',
    },
  });
  const bodyText = await upstream.text();
  return new NextResponse(bodyText, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

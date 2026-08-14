import { NextResponse } from 'next/server';
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth/access';
import { readTarget } from '@/lib/impersonation/cookie';
import {
  IMPERSONATE_COOKIE,
  isAllowedProxyPath,
  perimeterApiUrl,
} from '@/lib/impersonation/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/impersonate/data/<whitelisted path>
 *
 * Admin-only (MP role 2) read proxy, checked against LIVE MP roles — so an admin
 * whose role is revoked mid-session stops being able to read other people's data
 * within about a minute, rather than for as long as their cookie lasts.
 *
 * Reads the impersonation target from the signed cookie and forwards a
 * whitelisted perimeter-api GET with the service key + `x-on-behalf-of-user`, so
 * the gated widgets render the target's data. Read-only, whitelisted paths only —
 * impersonation can never drive a write.
 */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const hdrs = await nextHeaders();
  const gate = await requireAdmin(hdrs);
  if (!gate.ok) return gate.response;

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
  // `joined` already carries the perimeter-api `/api/...` prefix (the widgets
  // request it verbatim), so this is a transparent pass-through to the origin.
  const url = `${perimeterApiUrl()}/${joined}${search}`;

  const upstream = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'x-on-behalf-of-user': String(target),
      accept: 'application/json',
    },
  });
  const bodyText = await upstream.text();
  // Log AFTER the round-trip so the upstream status + body size are captured —
  // this is what distinguishes "target has no data" (200, tiny body) from an
  // on-behalf-of failure (4xx) when a widget renders empty.
  console.log(
    JSON.stringify({
      event: 'impersonate.proxy',
      by: gate.access.email,
      target,
      path: joined,
      status: upstream.status,
      bytes: bodyText.length,
    }),
  );
  return new NextResponse(bodyText, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

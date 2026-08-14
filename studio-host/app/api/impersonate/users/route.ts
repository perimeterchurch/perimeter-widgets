import { NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { requireAdmin } from '@/lib/auth/access';
import { perimeterApiUrl } from '@/lib/impersonation/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/impersonate/users?q=<name|login|email>
 *
 * Admin-only (MP role 2) search that backs the impersonation target picker,
 * checked against LIVE MP roles. Proxies perimeter-api's service-only
 * `/api/users/search` with the shared service key AFTER the shell's own
 * Administrator gate, so the user directory never rides on an ordinary widget
 * token. Read-only; no target cookie needed (this is how an admin CHOOSES a
 * target).
 */
export async function GET(req: Request) {
  const hdrs = await nextHeaders();
  const gate = await requireAdmin(hdrs);
  if (!gate.ok) return gate.response;

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ error: 'query_too_short' }, { status: 400 });
  }

  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const url = `${perimeterApiUrl()}/api/users/search?q=${encodeURIComponent(q)}`;
  const upstream = await fetch(url, {
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
  });
  const bodyText = await upstream.text();
  return new NextResponse(bodyText, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

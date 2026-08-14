import { headers as nextHeaders } from 'next/headers';
import { resolveAccess } from '@/lib/auth/access';

// Needs the client secret and makes outbound MP / perimeter-api calls.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/session-check — the wall's verifier.
 *
 * The middleware can't do this itself: verifying a Better Auth session means
 * checking a signature with the server secret and (here) calling perimeter-api,
 * neither of which belongs in edge middleware. So middleware forwards the
 * request's cookies here and switches on the status:
 *
 *   200 → proceed          401 → /sign-in          403 → /access-denied
 *
 * That replaces a bare cookie-PRESENCE check, which served the entire studio
 * shell to anyone holding an expired or forged cookie (the data routes refused
 * them, so the symptom was a fully-rendered studio with silently empty widgets).
 *
 * Body is deliberately minimal — the status carries the decision.
 */
export async function GET() {
  const access = await resolveAccess(await nextHeaders());

  if (access.status === 'unauthenticated') {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (access.status === 'forbidden') {
    return Response.json({ ok: false }, { status: 403 });
  }
  return Response.json({ ok: true, isAdmin: access.isAdmin });
}

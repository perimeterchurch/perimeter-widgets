import { auth } from '@/lib/auth/better-auth';
import { toCurrentCallback } from '@/lib/auth/legacy-callback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Legacy MP redirect URI → Better Auth 1.7's callback route (see
// lib/auth/legacy-callback.ts). This static segment outranks the
// /api/auth/[...all] catch-all, which would otherwise 404 the old path.
export async function GET(req: Request) {
  return auth.handler(toCurrentCallback(req));
}

export async function POST(req: Request) {
  return auth.handler(toCurrentCallback(req));
}

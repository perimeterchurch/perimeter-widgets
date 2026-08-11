import { auth } from '@/lib/auth/better-auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Mounts the whole Better Auth surface (sign-in start, OAuth callback, session,
// sign-out) under /api/auth/*. Verbatim from the Knowledge Base. Node runtime
// (default) — it needs the client secret and makes outbound MP calls.
export const { GET, POST } = toNextJsHandler(auth);

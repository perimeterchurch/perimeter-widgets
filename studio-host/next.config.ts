import type { NextConfig } from 'next';

/**
 * The Vite-built studio is copied into ./public by scripts/embed-studio.mjs.
 * Serve it as a single-page app: every path that isn't a real asset, a Next
 * internal, or an API route renders the studio's index.html so client-side
 * routes (/tokens, /components/*, /guides/*) and hard-reloaded deep links
 * resolve to the SPA instead of 404ing.
 *
 * Uses `afterFiles` (NOT `beforeFiles`) so it runs AFTER Next's own routes:
 * real handlers win and the SPA is only the fallback. That keeps `/api/auth/*`
 * (Task 1.2), the `/signin` + `/unauthorized` pages (Task 1.4), and `/health`
 * reachable — a `beforeFiles` rewrite would shadow them all. `/` has no
 * app/page.tsx, so it falls through to the SPA. The middleware gate (Task 1.3)
 * still runs ahead of everything.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      afterFiles: [
        { source: '/', destination: '/index.html' },
        {
          // anything without a file extension, not under api/ _next/ assets/
          source: '/((?!api/|_next/|assets/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
          destination: '/index.html',
        },
      ],
    };
  },
};

export default nextConfig;

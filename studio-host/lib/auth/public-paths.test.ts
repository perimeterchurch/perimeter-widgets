import { describe, it, expect } from 'vitest';
import { isPublicPath } from './public-paths';

/**
 * The SPA fallback from `next.config.ts` (afterFiles), copied verbatim as a
 * regex. If that source string changes, change it here too — this test exists to
 * hold the two rules in agreement.
 */
const SPA_FALLBACK = /^\/((?!api\/|_next\/|assets\/|favicon\.ico|.*\.[a-zA-Z0-9]+$).*)$/;

/**
 * Real Next routes (`app/health/route.ts`, `app/signin/page.tsx`,
 * `app/unauthorized/page.tsx`). The rewrite is registered under `afterFiles`, so
 * these win over the fallback — which is precisely why they can be public
 * WITHOUT handing out the studio, and why the complement property below holds.
 */
const REAL_ROUTES = new Set(['/health', '/signin', '/unauthorized']);

const servesTheStudio = (path: string) =>
  !REAL_ROUTES.has(path) && (path === '/' || SPA_FALLBACK.test(path));

/** Paths that must NOT require a session. */
const PUBLIC = ['/health', '/signin', '/unauthorized', '/favicon.ico'];
const PUBLIC_UNDER_PREFIX = [
  '/api/me',
  '/api/auth/callback/ministryplatform',
  '/api/impersonate/start',
  '/_next/static/chunk.js',
  '/assets/index-abc123.js',
];

/**
 * The regression corpus: every one of these skipped the wall AND was served
 * index.html under the old unanchored-lookahead matcher.
 */
const PREFIX_LOOKALIKES = [
  '/apifoo',
  '/api-docs',
  '/assetsfoo',
  '/healthz',
  '/healthcheck/deep/link',
  '/signinx',
  '/unauthorizedx',
];

const STUDIO_ROUTES = ['/', '/tokens', '/widgets/my-giving-history', '/guides/styling-widgets'];

describe('isPublicPath', () => {
  it.each(PUBLIC)('exempts the public page %s', (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(PUBLIC_UNDER_PREFIX)('exempts %s via a segment-anchored prefix', (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(PREFIX_LOOKALIKES)('gates %s — a bare prefix is not an exemption', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it.each(STUDIO_ROUTES)('gates the studio route %s', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it('gates a path that merely CONTAINS a public name', () => {
    expect(isPublicPath('/x/api/me')).toBe(false);
    expect(isPublicPath('/prefix-signin')).toBe(false);
  });
});

describe('the wall and the SPA rewrite are complements', () => {
  // The property that actually matters: nothing may be BOTH ungated AND handed
  // the studio's index.html. Violating it is the bypass, whatever the syntax.
  const ALL = [...PUBLIC, ...PUBLIC_UNDER_PREFIX, ...PREFIX_LOOKALIKES, ...STUDIO_ROUTES];

  it.each(ALL)('%s is gated, or is not served the studio', (path) => {
    expect(!isPublicPath(path) || !servesTheStudio(path)).toBe(true);
  });
});

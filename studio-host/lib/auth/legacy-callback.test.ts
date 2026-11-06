import { describe, it, expect, beforeAll } from 'vitest';

// The MP redirect URI still points at the pre-1.7 path. Prove a request there
// reaches Better Auth's callback handler (not a 404), and that sign-in sends
// MP that same registered redirect_uri.
describe('legacy MP OAuth callback path', () => {
  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET ||= 'test-secret-test-secret-test-secret';
    process.env.BETTER_AUTH_URL ||= 'http://localhost:5273';
    process.env.MP_API_BASEURL ||= 'https://ministryplatform.perimeter.org/ministryplatformapi';
    process.env.MP_API_CLIENT ||= 'test-client';
    process.env.MP_API_SECRET ||= 'test-secret';
  });

  it('rewrites the old callback path onto the current one', async () => {
    const { toCurrentCallback } = await import('./legacy-callback');
    const out = toCurrentCallback(
      new Request('http://localhost:5273/api/auth/oauth2/callback/ministryplatform?code=a&state=b'),
    );
    expect(new URL(out.url).pathname).toBe('/api/auth/callback/ministryplatform');
    expect(new URL(out.url).search).toBe('?code=a&state=b');
  });

  it('reaches the Better Auth callback handler instead of 404ing', async () => {
    const { toCurrentCallback } = await import('./legacy-callback');
    const { auth } = await import('./better-auth');
    const res = await auth.handler(
      toCurrentCallback(
        new Request(
          'http://localhost:5273/api/auth/oauth2/callback/ministryplatform?code=a&state=b',
        ),
      ),
    );
    // No state cookie → the handler redirects to its error page.
    expect(res.status).not.toBe(404);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });

  it('pins the registered MP redirect URI', async () => {
    const { MP_REDIRECT_PATH } = await import('./better-auth');
    expect(MP_REDIRECT_PATH).toBe('/api/auth/oauth2/callback/ministryplatform');
  });
});

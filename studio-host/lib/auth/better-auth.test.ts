import { describe, it, expect } from 'vitest';

// Confirms the Better Auth config actually constructs at runtime (resolved via
// Vite, same extensionless module resolution Next uses). Discovery is lazy, so
// construction is offline and side-effect-free.
describe('better-auth config', () => {
  it('constructs the auth instance with a request handler', async () => {
    process.env.BETTER_AUTH_SECRET ||= 'test-secret';
    process.env.BETTER_AUTH_URL ||= 'http://localhost:5273';
    process.env.MP_API_BASEURL ||= 'https://ministryplatform.perimeter.org/ministryplatformapi';
    process.env.MP_API_CLIENT ||= 'test-client';
    process.env.MP_API_SECRET ||= 'test-secret';

    const mod = await import('./better-auth');
    expect(mod.auth).toBeDefined();
    expect(typeof mod.auth.handler).toBe('function');
  });
});

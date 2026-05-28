import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('better-auth/cookies', () => ({
  getSessionCookie: (req: NextRequest) => (req.cookies.get('studio.session_token') ? 'tok' : null),
}));

describe('admin middleware', () => {
  it('passes through when a session cookie is present', async () => {
    const { middleware } = await import('../src/middleware');
    const req = new NextRequest('https://studio.perimeter.org/admin/releases');
    req.cookies.set('studio.session_token', 'x');
    const res = middleware(req);
    expect(res).toBeUndefined();
  });

  it('redirects to /admin/login when no session cookie', async () => {
    const { middleware } = await import('../src/middleware');
    const req = new NextRequest('https://studio.perimeter.org/admin/releases');
    const res = middleware(req);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/admin/login');
  });
});

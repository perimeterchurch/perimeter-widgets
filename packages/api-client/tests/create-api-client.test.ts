import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from '../src/create-api-client';
import type { AuthProvider } from '@perimeter/auth';

function fakeAuth(token: string | null): AuthProvider {
  return {
    getToken: () => token,
    isAuthenticated: () => token !== null,
    onChange: () => () => {},
  };
}

describe('createApiClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchSpy;
  });

  it('prefixes paths with baseUrl', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com' });
    await client.fetch('/sermons');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/sermons', expect.any(Object));
  });

  it('adds Authorization header when auth provides a token', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth('xyz') });
    await client.fetch('/me');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer xyz');
  });

  it('omits Authorization header when auth has no token', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth(null) });
    await client.fetch('/public');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('omits Authorization when no auth is configured', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com' });
    await client.fetch('/public');
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('preserves caller-supplied headers', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com', auth: fakeAuth('t') });
    await client.fetch('/x', { headers: { 'X-Trace': '1' } });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('X-Trace')).toBe('1');
    expect(headers.get('Authorization')).toBe('Bearer t');
  });

  it('handles a baseUrl with a trailing slash and a path with a leading slash', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.com/' });
    await client.fetch('/x');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/x', expect.any(Object));
  });
});

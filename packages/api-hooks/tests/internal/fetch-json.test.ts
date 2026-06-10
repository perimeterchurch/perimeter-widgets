import { describe, it, expect, vi } from 'vitest';
import { fetchJson, ApiError } from '../../src/internal/fetch-json';

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function err(status: number, body?: unknown): Response {
  if (body === undefined) return new Response('', { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchJson', () => {
  it('resolves the parsed JSON body on a 200 response', async () => {
    const body = { success: true, data: [{ id: 1, name: 'Romans' }] };
    const client = { fetch: vi.fn().mockResolvedValue(ok(body)) };

    const result = await fetchJson<typeof body>(client, '/api/sermons/books', 'Books');

    expect(client.fetch).toHaveBeenCalledWith('/api/sermons/books');
    expect(result).toEqual(body);
  });

  it('throws a typed ApiError carrying the HTTP status', async () => {
    const client = { fetch: vi.fn().mockResolvedValue(err(500)) };

    await expect(fetchJson(client, '/api/sermons/books', 'Books')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });
  });

  it('falls back to the label+status message when the body has none', async () => {
    const client = { fetch: vi.fn().mockResolvedValue(err(500)) };

    await expect(fetchJson(client, '/api/sermons/books', 'Books')).rejects.toThrow(
      'Books request failed: 500',
    );
  });

  it("surfaces perimeter-api's error envelope message when present", async () => {
    const client = {
      fetch: vi.fn().mockResolvedValue(err(400, { error: { message: 'top must be positive' } })),
    };

    await expect(fetchJson(client, '/api/sermons', 'Sermons')).rejects.toThrow(
      'top must be positive',
    );
  });

  it('flags a 401 as an auth error so the UI can show a session-expired state', async () => {
    const client = { fetch: vi.fn().mockResolvedValue(err(401)) };

    try {
      await fetchJson(client, '/api/sermons', 'Sermons');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).isAuthError).toBe(true);
    }
  });
});

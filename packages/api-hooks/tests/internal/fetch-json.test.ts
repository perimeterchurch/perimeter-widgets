import { describe, it, expect, vi } from 'vitest';
import { fetchJson } from '../../src/internal/fetch-json';

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
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

  it('throws with the label and status on a non-2xx response', async () => {
    const client = { fetch: vi.fn().mockResolvedValue(new Response('', { status: 500 })) };

    await expect(fetchJson(client, '/api/sermons/books', 'Books')).rejects.toThrow(
      'Books request failed: 500',
    );
  });
});

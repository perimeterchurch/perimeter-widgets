import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.mock('@perimeter/widget-runtime', () => ({
  useApiClient: () => ({ fetch: mockFetch }),
}));

import { useBooks } from '../../src/sermons/use-books';

function wrap(qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useBooks', () => {
  it('fetches /api/sermons/books with no params', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useBooks(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/books');
  });

  it('serializes query params into the URL', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useBooks({ speakerId: '5' }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/books?speakerId=5');
  });

  it('returns the decoded JSON body', async () => {
    const body = { success: true, data: [{ id: 1, name: 'Romans' }] };
    mockFetch.mockResolvedValue(ok(body));
    const { result } = renderHook(() => useBooks(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useBooks(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

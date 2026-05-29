import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.mock('@perimeter/widget-runtime', () => ({
  useApiClient: () => ({ fetch: mockFetch }),
}));

import { useSermons, type UseSermonsParams } from '../../src/sermons/use-sermons';

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

describe('useSermons', () => {
  it('fetches /api/sermons with serialized query params', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const params: UseSermonsParams = { page: 2, perPage: 10, search: 'grace' };
    const { result } = renderHook(() => useSermons(params), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons?page=2&perPage=10&search=grace');
  });

  it('returns the decoded JSON body', async () => {
    const body = {
      success: true,
      data: { sermons: [], pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 } },
    };
    mockFetch.mockResolvedValue(ok(body));
    const { result } = renderHook(() => useSermons({}), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useSermons({}), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('uses a query key that includes params (distinct params → distinct cache entries)', async () => {
    mockFetch.mockImplementation(() => Promise.resolve(ok({ success: true })));
    const wrapper = wrap();
    const { result: r1 } = renderHook(() => useSermons({ page: 1 }), { wrapper });
    const { result: r2 } = renderHook(() => useSermons({ page: 2 }), { wrapper });
    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons?page=1');
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons?page=2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

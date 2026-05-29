import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.mock('@perimeter/widget-runtime', () => ({
  useApiClient: () => ({ fetch: mockFetch }),
}));

import { useSeriesDetail } from '../../src/sermons/use-series-detail';

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

describe('useSeriesDetail', () => {
  it('fetches /api/sermons/series/:id', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useSeriesDetail(7), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/series/7');
  });

  it('returns the decoded JSON body', async () => {
    const body = { success: true, data: { id: 7, title: 'Romans' } };
    mockFetch.mockResolvedValue(ok(body));
    const { result } = renderHook(() => useSeriesDetail(7), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useSeriesDetail(7), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('is disabled and does not fetch when id <= 0', async () => {
    const { result } = renderHook(() => useSeriesDetail(0), { wrapper: wrap() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });
});

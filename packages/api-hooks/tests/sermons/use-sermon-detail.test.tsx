import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.mock('@perimeter/widget-runtime', () => ({
  useApiClient: () => ({ fetch: mockFetch }),
}));

import { useSermonDetail } from '../../src/sermons/use-sermon-detail';

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

describe('useSermonDetail', () => {
  it('fetches /api/sermons/sermon/:id', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useSermonDetail(42), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/sermon/42');
  });

  it('returns the decoded JSON body', async () => {
    const body = { success: true, data: { id: 42, title: 'Grace' } };
    mockFetch.mockResolvedValue(ok(body));
    const { result } = renderHook(() => useSermonDetail(42), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useSermonDetail(42), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('is disabled and does not fetch when id <= 0', async () => {
    const { result } = renderHook(() => useSermonDetail(0), { wrapper: wrap() });
    // The query is disabled, so it stays in a non-fetching pending state.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
  });
});

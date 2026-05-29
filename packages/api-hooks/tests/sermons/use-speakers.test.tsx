import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetch = vi.fn();
vi.mock('@perimeter/widget-runtime', () => ({
  useApiClient: () => ({ fetch: mockFetch }),
}));

import { useSpeakers } from '../../src/sermons/use-speakers';

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

describe('useSpeakers', () => {
  it('fetches /api/sermons/speakers with no params', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useSpeakers(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/speakers');
  });

  it('serializes query params into the URL', async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    const { result } = renderHook(() => useSpeakers({ seriesTypeId: '3', search: 'paul' }), {
      wrapper: wrap(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/sermons/speakers?seriesTypeId=3&search=paul');
  });

  it('returns the decoded JSON body', async () => {
    const body = { success: true, data: [{ id: 1, name: 'Paul', bio: null }] };
    mockFetch.mockResolvedValue(ok(body));
    const { result } = renderHook(() => useSpeakers(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 500 }));
    const { result } = renderHook(() => useSpeakers(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useBooks } from '../../hooks/use-books';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockBooksResponse = {
    success: true as const,
    data: [
        { id: 1, name: 'Genesis' },
        { id: 2, name: 'Exodus' },
    ],
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/books`, () => {
        return HttpResponse.json(mockBooksResponse);
    }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const testConfig: SermonsConfig = {
    perPage: 12,
    defaultTab: 'sermons',
    defaultView: 'grid',
    display: 'full',
    apiUrl: BASE_URL,
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe('useBooks', () => {
    it('sends no query string when no filters provided', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/books`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockBooksResponse);
            }),
        );

        const { result } = renderHook(
            () => useBooks({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect([...url.searchParams.entries()]).toEqual([]);
    });

    it('forwards selectedSpeakerIds as comma-separated speakerId', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/books`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockBooksResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useBooks({
                    config: testConfig,
                    selectedSpeakerIds: [3, 4],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('speakerId')).toBe('3,4');
    });

    it('does not forward a bookId query param', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/books`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockBooksResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useBooks({
                    config: testConfig,
                    selectedSpeakerIds: [1],
                    selectedSeriesIds: [2],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.has('bookId')).toBe(false);
    });
});

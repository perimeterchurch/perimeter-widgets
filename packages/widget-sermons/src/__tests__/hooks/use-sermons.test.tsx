/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSermons } from '../../hooks/use-sermons';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSermonsResponse = {
    success: true as const,
    data: {
        sermons: [
            {
                id: 1,
                title: 'Test Sermon',
                subtitle: null,
                date: '2026-01-01',
                shortDescription: 'A test sermon',
                bannerUrl: null,
                speaker: { id: 1, name: 'John Smith' },
                series: { id: 1, title: 'Test Series' },
                congregation: { id: 1 },
                book: null,
            },
        ],
        pagination: { page: 1, perPage: 12, total: 1, totalPages: 1 },
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons`, () => {
        return HttpResponse.json(mockSermonsResponse);
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

describe('useSermons', () => {
    it('fetches paginated sermons with default params', async () => {
        const { result } = renderHook(
            () => useSermons({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.sermons).toHaveLength(1);
        expect(result.current.data?.sermons[0]?.title).toBe('Test Sermon');
    });

    it('passes filter params to API', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSermonsResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSermons({
                    config: testConfig,
                    search: 'grace',
                    selectedSpeakerIds: [5],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('search')).toBe('grace');
        expect(url.searchParams.get('speakerId')).toBe('5');
    });

    it('throws on API error', async () => {
        server.use(
            http.get(`${BASE_URL}/api/sermons`, () => {
                return HttpResponse.json(
                    { success: false, error: { message: 'Server error' } },
                    { status: 500 },
                );
            }),
        );

        const { result } = renderHook(
            () => useSermons({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error?.message).toContain(
            'Failed to fetch sermons',
        );
    });
});

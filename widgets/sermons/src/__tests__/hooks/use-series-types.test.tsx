/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSeriesTypes } from '../../hooks/use-series-types';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSeriesTypesResponse = {
    success: true as const,
    data: [
        { id: 1, name: 'Sermon Series' },
        { id: 2, name: 'Bible Study' },
    ],
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/series-types`, () =>
        HttpResponse.json(mockSeriesTypesResponse),
    ),
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

describe('useSeriesTypes', () => {
    it('fetches series types', async () => {
        const { result } = renderHook(
            () => useSeriesTypes({ config: testConfig }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
    });

    it('forwards selected filter dimensions as comma-separated query params', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/series-types`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSeriesTypesResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSeriesTypes({
                    config: testConfig,
                    selectedSeriesIds: [1, 2],
                    selectedSpeakerIds: [3],
                    selectedBookIds: [4, 5],
                    selectedServiceTypeIds: [6],
                }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('seriesId')).toBe('1,2');
        expect(url.searchParams.get('speakerId')).toBe('3');
        expect(url.searchParams.get('bookId')).toBe('4,5');
        expect(url.searchParams.get('serviceTypeId')).toBe('6');
    });

    it('does not forward a seriesTypeId param to the series-types endpoint', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/series-types`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSeriesTypesResponse);
            }),
        );
        const { result } = renderHook(
            () =>
                useSeriesTypes({
                    config: testConfig,
                    selectedSeriesIds: [1],
                }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(capturedUrl).searchParams.has('seriesTypeId')).toBe(
            false,
        );
    });

    it('throws on API error', async () => {
        server.use(
            http.get(`${BASE_URL}/api/sermons/series-types`, () =>
                HttpResponse.json(
                    { success: false, error: { message: 'Server error' } },
                    { status: 500 },
                ),
            ),
        );

        const { result } = renderHook(
            () => useSeriesTypes({ config: testConfig }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toContain(
            'Failed to fetch series types',
        );
    });
});

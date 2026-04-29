/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useServiceTypes } from '../../hooks/use-service-types';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockServiceTypesResponse = {
    success: true as const,
    data: [
        { id: 1, name: 'Sunday Morning' },
        { id: 2, name: 'Sunday Evening' },
    ],
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/service-types`, () =>
        HttpResponse.json(mockServiceTypesResponse),
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

describe('useServiceTypes', () => {
    it('fetches service types', async () => {
        const { result } = renderHook(
            () => useServiceTypes({ config: testConfig }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
    });

    it('forwards selected filter dimensions as comma-separated query params', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/service-types`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockServiceTypesResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useServiceTypes({
                    config: testConfig,
                    selectedSeriesIds: [1, 2],
                    selectedSpeakerIds: [3],
                    selectedBookIds: [4, 5],
                    selectedSeriesTypeIds: [6],
                }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('seriesId')).toBe('1,2');
        expect(url.searchParams.get('speakerId')).toBe('3');
        expect(url.searchParams.get('bookId')).toBe('4,5');
        expect(url.searchParams.get('seriesTypeId')).toBe('6');
    });

    it('does not forward a serviceTypeId param to the service-types endpoint', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/service-types`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockServiceTypesResponse);
            }),
        );
        const { result } = renderHook(
            () =>
                useServiceTypes({
                    config: testConfig,
                    selectedSeriesIds: [1],
                }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(capturedUrl).searchParams.has('serviceTypeId')).toBe(
            false,
        );
    });

    it('throws on API error', async () => {
        server.use(
            http.get(`${BASE_URL}/api/sermons/service-types`, () =>
                HttpResponse.json(
                    { success: false, error: { message: 'Server error' } },
                    { status: 500 },
                ),
            ),
        );

        const { result } = renderHook(
            () => useServiceTypes({ config: testConfig }),
            { wrapper: createWrapper() },
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toContain(
            'Failed to fetch service types',
        );
    });
});

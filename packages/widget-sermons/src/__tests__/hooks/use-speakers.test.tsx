/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSpeakers } from '../../hooks/use-speakers';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSpeakersResponse = {
    success: true as const,
    data: [
        { id: 1, name: 'John Smith', bio: null },
        { id: 2, name: 'Jane Doe', bio: null },
    ],
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/speakers`, () => {
        return HttpResponse.json(mockSpeakersResponse);
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

describe('useSpeakers', () => {
    it('sends no query string when no filters provided', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSpeakersResponse);
            }),
        );

        const { result } = renderHook(
            () => useSpeakers({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        // Allow at most undefined-stripped query string
        expect([...url.searchParams.entries()]).toEqual([]);
    });

    it('forwards selectedSeriesIds as comma-separated seriesId', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSpeakersResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSpeakers({
                    config: testConfig,
                    selectedSeriesIds: [1, 2],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('seriesId')).toBe('1,2');
    });

    it('forwards search param', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSpeakersResponse);
            }),
        );

        const { result } = renderHook(
            () => useSpeakers({ config: testConfig, search: 'grace' }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('search')).toBe('grace');
    });

    it('uses distinct cache entries for different filter combinations', async () => {
        let requestCount = 0;
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, () => {
                requestCount += 1;
                return HttpResponse.json(mockSpeakersResponse);
            }),
        );

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        const { result: result1 } = renderHook(
            () => useSpeakers({ config: testConfig, selectedBookIds: [1] }),
            { wrapper },
        );
        await waitFor(() => expect(result1.current.isSuccess).toBe(true));

        const { result: result2 } = renderHook(
            () => useSpeakers({ config: testConfig, selectedBookIds: [2] }),
            { wrapper },
        );
        await waitFor(() => expect(result2.current.isSuccess).toBe(true));

        expect(requestCount).toBe(2);
    });

    it('does not forward a speakerId query param', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSpeakersResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSpeakers({
                    config: testConfig,
                    selectedSeriesIds: [1],
                    selectedBookIds: [2],
                    selectedServiceTypeIds: [3],
                    selectedSeriesTypeIds: [4],
                    search: 'x',
                    from: '2026-01-01',
                    to: '2026-12-31',
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.has('speakerId')).toBe(false);
    });
});

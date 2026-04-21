/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSeries } from '../../hooks/use-series';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSeriesResponse = {
    success: true as const,
    data: {
        series: [],
        pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 },
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/series`, () => {
        return HttpResponse.json(mockSeriesResponse);
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

describe('useSeries', () => {
    it('forwards selectedSpeakerIds as comma-separated speakerId', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons/series`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSeriesResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSeries({
                    config: testConfig,
                    selectedSpeakerIds: [7],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('speakerId')).toBe('7');
    });
});

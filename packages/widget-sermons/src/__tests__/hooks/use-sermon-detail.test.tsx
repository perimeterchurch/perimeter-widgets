/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSermonDetail } from '../../hooks/use-sermon-detail';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSermonDetail = {
    success: true as const,
    data: {
        id: 42,
        title: 'Grace Abounding',
        subtitle: null,
        date: '2026-03-15',
        description: '<p>Full sermon description</p>',
        shortDescription: 'A sermon on grace',
        bannerUrl: null,
        speaker: { id: 1, name: 'John Smith', bio: null },
        series: { id: 1, title: 'Grace Series' },
        congregation: { id: 1 },
        book: { id: 1, name: 'Romans' },
        transcript: null,
        scriptureLinks: null,
        links: [
            {
                id: 1,
                url: 'https://cdn.example.com/audio.mp3',
                type: 'audio/mpeg',
                mediaType: 'audio' as const,
                duration: '00:45:00',
                position: 1,
            },
        ],
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/sermon/:id`, ({ params }) => {
        if (params.id === '999') {
            return HttpResponse.json(
                { success: false, error: { message: 'Not found' } },
                { status: 404 },
            );
        }
        return HttpResponse.json(mockSermonDetail);
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

describe('useSermonDetail', () => {
    it('fetches sermon by ID', async () => {
        const { result } = renderHook(
            () => useSermonDetail(42, testConfig),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.title).toBe('Grace Abounding');
        expect(result.current.data?.speaker.name).toBe('John Smith');
    });

    it('is disabled when id is null', () => {
        const { result } = renderHook(
            () => useSermonDetail(null, testConfig),
            { wrapper: createWrapper() },
        );

        expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles 404 response', async () => {
        const { result } = renderHook(
            () => useSermonDetail(999, testConfig),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error?.message).toContain(
            'Failed to fetch sermon detail',
        );
    });
});

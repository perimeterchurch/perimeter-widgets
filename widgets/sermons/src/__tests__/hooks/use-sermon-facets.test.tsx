/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSermonFacets } from '../../hooks/use-sermon-facets';
import {
    useFilterLabelCache,
    type FilterLabelCache,
} from '../../hooks/use-filter-label-cache';
import type { useSermonFilters } from '../../hooks/use-sermon-filters';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const speakers = [
    { id: 1, name: 'Alice Smith' },
    { id: 2, name: 'Bob Jones' },
];
const books = [
    { id: 10, name: 'Genesis' },
    { id: 11, name: 'Exodus' },
];
const serviceTypes = [{ id: 20, name: 'Sunday Morning' }];
const seriesTypes = [{ id: 30, name: 'Sermon Series' }];
const series = [
    { id: 100, title: 'Genesis Walk', displayTitle: 'Genesis Walk' },
];

const seriesPageResponse = {
    success: true as const,
    data: {
        series,
        pagination: { page: 1, perPage: 50, total: 1, totalPages: 1 },
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/speakers`, () =>
        HttpResponse.json({ success: true, data: speakers }),
    ),
    http.get(`${BASE_URL}/api/sermons/books`, () =>
        HttpResponse.json({ success: true, data: books }),
    ),
    http.get(`${BASE_URL}/api/sermons/service-types`, () =>
        HttpResponse.json({ success: true, data: serviceTypes }),
    ),
    http.get(`${BASE_URL}/api/sermons/series-types`, () =>
        HttpResponse.json({ success: true, data: seriesTypes }),
    ),
    http.get(`${BASE_URL}/api/sermons/series`, () =>
        HttpResponse.json(seriesPageResponse),
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

const emptyFilters = {
    search: '',
    selectedSeriesIds: [],
    selectedSpeakerIds: [],
    selectedBookIds: [],
    selectedServiceTypeIds: [],
    selectedSeriesTypeIds: [],
    from: null,
    to: null,
} as unknown as ReturnType<typeof useSermonFilters>;

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

function renderFacets(
    overrides: Partial<ReturnType<typeof useSermonFilters>> = {},
) {
    let cache!: FilterLabelCache;
    const result = renderHook(
        () => {
            cache = useFilterLabelCache();
            return useSermonFacets({
                config: testConfig,
                filters: { ...emptyFilters, ...overrides } as ReturnType<
                    typeof useSermonFilters
                >,
                labelCache: cache,
            });
        },
        { wrapper: createWrapper() },
    );
    return { ...result, getCache: () => cache };
}

describe('useSermonFacets', () => {
    it('returns the narrowed facet lists once the queries resolve', async () => {
        const { result } = renderFacets();

        await waitFor(() => {
            expect(result.current.speakers).toHaveLength(2);
            expect(result.current.books).toHaveLength(2);
            expect(result.current.serviceTypes).toHaveLength(1);
            expect(result.current.seriesTypes).toHaveLength(1);
            expect(result.current.series).toHaveLength(1);
        });
    });

    it('absorbs primer results into the label cache so dropped chips can rehydrate', async () => {
        const { result, getCache } = renderFacets();

        await waitFor(() => expect(result.current.speakers).toHaveLength(2));

        const cache = getCache();
        expect(cache.getLabel('speaker', 1)).toBe('Alice Smith');
        expect(cache.getLabel('book', 10)).toBe('Genesis');
        expect(cache.getLabel('series', 100)).toBe('Genesis Walk');
        expect(cache.getLabel('serviceType', 20)).toBe('Sunday Morning');
        expect(cache.getLabel('seriesType', 30)).toBe('Sermon Series');
    });

    it('forwards filters into the narrowed query but not the primer one', async () => {
        const speakerCalls: string[] = [];
        server.use(
            http.get(`${BASE_URL}/api/sermons/speakers`, ({ request }) => {
                speakerCalls.push(request.url);
                return HttpResponse.json({ success: true, data: speakers });
            }),
        );

        const { result } = renderFacets({
            selectedBookIds: [10],
            selectedSeriesIds: [100],
        });

        await waitFor(() => expect(result.current.speakers).toHaveLength(2));

        // Two calls should have happened: primer (no filters) + narrowed
        // (with bookId+seriesId). Order isn't guaranteed.
        expect(speakerCalls).toHaveLength(2);
        const primer = speakerCalls.find(
            (u) => !new URL(u).searchParams.has('bookId'),
        );
        const narrowed = speakerCalls.find((u) =>
            new URL(u).searchParams.has('bookId'),
        );
        expect(primer).toBeDefined();
        expect(narrowed).toBeDefined();
        expect(new URL(narrowed!).searchParams.get('bookId')).toBe('10');
        expect(new URL(narrowed!).searchParams.get('seriesId')).toBe('100');
    });
});

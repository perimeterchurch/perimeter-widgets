import { http, HttpResponse } from 'msw';
import type { operations } from '@perimeter-widgets/shared';
import {
    mockSermons,
    mockSermonDetail,
    mockSeries,
    mockSpeakers,
    mockBooks,
    mockServiceTypes,
} from '@/mocks/data/sermons';

type ListSermonsResponse =
    operations['listSermons']['responses']['200']['content']['application/json'];
type GetSermonResponse =
    operations['getSermon']['responses']['200']['content']['application/json'];
type ListSeriesResponse =
    operations['listSeries']['responses']['200']['content']['application/json'];
type GetSeriesDetailResponse =
    operations['getSeriesDetail']['responses']['200']['content']['application/json'];
type ListSpeakersResponse =
    operations['listSpeakers']['responses']['200']['content']['application/json'];
type ListBooksResponse =
    operations['listBooks']['responses']['200']['content']['application/json'];

const API_ORIGINS = ['http://localhost:5500', 'https://api.perimeter.org'];

function apiHandlers(origin: string) {
    return [
        http.get(`${origin}/api/sermons`, ({ request }) => {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') ?? '1');
            const perPage = parseInt(url.searchParams.get('perPage') ?? '12');
            const search = url.searchParams.get('search')?.toLowerCase();

            const seriesId = url.searchParams.get('seriesId');
            const speakerId = url.searchParams.get('speakerId');

            let filtered = mockSermons;
            if (search) {
                filtered = filtered.filter(
                    (s) =>
                        s.title.toLowerCase().includes(search)
                        || s.shortDescription?.toLowerCase().includes(search),
                );
            }
            if (seriesId) {
                filtered = filtered.filter(
                    (s) => s.series.id === Number(seriesId),
                );
            }
            if (speakerId) {
                filtered = filtered.filter(
                    (s) => s.speaker.id === Number(speakerId),
                );
            }

            const start = (page - 1) * perPage;
            const paged = filtered.slice(start, start + perPage);

            return HttpResponse.json({
                success: true,
                data: {
                    sermons: paged,
                    pagination: {
                        page,
                        perPage,
                        total: filtered.length,
                        totalPages: Math.ceil(filtered.length / perPage),
                    },
                },
            } satisfies ListSermonsResponse);
        }),

        http.get(`${origin}/api/sermons/series`, () => {
            return HttpResponse.json({
                success: true,
                data: mockSeries,
            } satisfies ListSeriesResponse);
        }),

        http.get(`${origin}/api/sermons/series/:id`, ({ params }) => {
            const series = mockSeries.find((s) => s.id === Number(params.id));
            if (!series)
                return HttpResponse.json(
                    { success: false, message: 'Not found' },
                    { status: 404 },
                );
            const sermons = mockSermons.filter(
                (s) => s.series.id === series.id,
            );
            return HttpResponse.json({
                success: true,
                data: { ...series, sermons },
            } satisfies GetSeriesDetailResponse);
        }),

        http.get(`${origin}/api/sermons/service-types`, () => {
            return HttpResponse.json({
                success: true,
                data: mockServiceTypes,
            });
        }),

        http.get(`${origin}/api/sermons/speakers`, () => {
            return HttpResponse.json({
                success: true,
                data: mockSpeakers,
            } satisfies ListSpeakersResponse);
        }),

        http.get(`${origin}/api/sermons/books`, () => {
            return HttpResponse.json({
                success: true,
                data: mockBooks,
            } satisfies ListBooksResponse);
        }),

        http.get(`${origin}/api/sermons/:id`, ({ params }) => {
            if (Number(params.id) === mockSermonDetail.id) {
                return HttpResponse.json({
                    success: true,
                    data: mockSermonDetail,
                } satisfies GetSermonResponse);
            }
            const sermon = mockSermons.find((s) => s.id === Number(params.id));
            if (!sermon)
                return HttpResponse.json(
                    { success: false, message: 'Not found' },
                    { status: 404 },
                );
            return HttpResponse.json({
                success: true,
                data: {
                    ...sermon,
                    description: null,
                    transcript: null,
                    scriptureLinks: null,
                    book: null,
                    speaker: mockSpeakers[0]!,
                    links: [],
                },
            } satisfies GetSermonResponse);
        }),
    ];
}

export const handlers = API_ORIGINS.flatMap(apiHandlers);

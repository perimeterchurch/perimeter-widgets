import { http, HttpResponse } from 'msw';
import {
    mockSermons,
    mockSermonDetail,
    mockSeries,
    mockSpeakers,
    mockBooks,
} from '@/mocks/data/sermons';

const API_ORIGINS = ['http://localhost:5500', 'https://api.perimeter.org'];

function apiHandlers(origin: string) {
    return [
        http.get(`${origin}/api/sermons`, ({ request }) => {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') ?? '1');
            const perPage = parseInt(url.searchParams.get('perPage') ?? '12');
            const search = url.searchParams.get('search')?.toLowerCase();

            let filtered = mockSermons;
            if (search) {
                filtered = filtered.filter(
                    (s) =>
                        s.title.toLowerCase().includes(search)
                        || s.shortDescription?.toLowerCase().includes(search),
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
            });
        }),

        http.get(`${origin}/api/sermons/series`, () => {
            return HttpResponse.json({ success: true, data: mockSeries });
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
            });
        }),

        http.get(`${origin}/api/sermons/speakers`, () => {
            return HttpResponse.json({ success: true, data: mockSpeakers });
        }),

        http.get(`${origin}/api/sermons/books`, () => {
            return HttpResponse.json({ success: true, data: mockBooks });
        }),

        http.get(`${origin}/api/sermons/:id`, ({ params }) => {
            if (Number(params.id) === mockSermonDetail.id) {
                return HttpResponse.json({
                    success: true,
                    data: mockSermonDetail,
                });
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
                    speaker: mockSpeakers[0],
                    links: [],
                },
            });
        }),
    ];
}

export const handlers = API_ORIGINS.flatMap(apiHandlers);

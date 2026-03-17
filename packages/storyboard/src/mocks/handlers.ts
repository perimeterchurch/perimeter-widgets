import { http, HttpResponse } from 'msw';
import { mockSermons, mockSeries } from './data/sermons';

// Match both dev (localhost) and production API URLs
const API_ORIGINS = [
    'http://localhost:5500',
    'https://api.perimeter.org',
];

function apiHandlers(origin: string) {
    return [
        http.get(`${origin}/api/sermons`, () => {
            return HttpResponse.json({
                success: true,
                data: mockSermons,
                meta: { count: mockSermons.length },
            });
        }),

        http.get(`${origin}/api/sermons/series`, () => {
            return HttpResponse.json({
                success: true,
                data: mockSeries,
                meta: { count: mockSeries.length },
            });
        }),

        http.get(`${origin}/api/sermons/:id`, ({ params }) => {
            const sermon = mockSermons.find(
                (s) => s.id === Number(params.id),
            );
            if (!sermon) {
                return HttpResponse.json(
                    { success: false, message: 'Not found' },
                    { status: 404 },
                );
            }
            return HttpResponse.json({ success: true, data: sermon });
        }),
    ];
}

export const handlers = API_ORIGINS.flatMap(apiHandlers);

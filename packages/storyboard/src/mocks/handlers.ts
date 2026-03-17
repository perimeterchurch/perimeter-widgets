import { http, HttpResponse } from 'msw';
import { mockSermons, mockSeries } from './data/sermons';

export const handlers = [
    http.get('https://api.perimeter.org/api/sermons', () => {
        return HttpResponse.json({
            success: true,
            data: mockSermons,
            meta: { count: mockSermons.length },
        });
    }),

    http.get('https://api.perimeter.org/api/sermons/series', () => {
        return HttpResponse.json({
            success: true,
            data: mockSeries,
            meta: { count: mockSeries.length },
        });
    }),

    http.get('https://api.perimeter.org/api/sermons/:id', ({ params }) => {
        const sermon = mockSermons.find((s) => s.id === Number(params.id));
        if (!sermon) {
            return HttpResponse.json(
                { success: false, message: 'Not found' },
                { status: 404 },
            );
        }
        return HttpResponse.json({ success: true, data: sermon });
    }),
];

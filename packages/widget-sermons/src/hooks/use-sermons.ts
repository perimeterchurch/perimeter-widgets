import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { PaginatedSermonsResponse, SortField, SortOrder } from '../types';
import { resolveCampusId, type SermonsConfig } from '../types';

export interface UseSermonsParams {
    search?: string;
    series?: number | null;
    speaker?: number | null;
    book?: number | null;
    campus?: number | null;
    from?: string | null;
    to?: string | null;
    sort?: SortField;
    order?: SortOrder;
    page?: number;
    config: SermonsConfig;
}

export function useSermons(params: UseSermonsParams) {
    const {
        search,
        series,
        speaker,
        book,
        campus,
        from,
        to,
        sort = 'date',
        order = 'desc',
        page = 1,
        config,
    } = params;
    const client = createApiClient({ baseUrl: config.apiUrl });
    const campusId = campus ?? resolveCampusId(config.campus);

    return useQuery({
        queryKey: [
            'sermons',
            {
                search,
                series,
                speaker,
                book,
                campus: campusId,
                from,
                to,
                sort,
                order,
                page,
                perPage: config.perPage,
            },
        ],
        queryFn: async () => {
            const sp = new URLSearchParams();
            if (search) sp.set('search', search);
            if (series) sp.set('seriesId', String(series));
            if (speaker) sp.set('speakerId', String(speaker));
            if (book) sp.set('bookId', String(book));
            if (campusId) sp.set('congregationId', String(campusId));
            if (from) sp.set('from', from);
            if (to) sp.set('to', to);
            sp.set('sort', sort);
            sp.set('order', order);
            sp.set('page', String(page));
            sp.set('perPage', String(config.perPage));
            return client.get<PaginatedSermonsResponse>(
                `/api/sermons?${sp.toString()}`,
            );
        },
    });
}

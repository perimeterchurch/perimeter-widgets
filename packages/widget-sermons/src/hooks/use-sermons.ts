import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SortField, SortOrder } from '../types';
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
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons', {
                params: {
                    query: {
                        search: search || undefined,
                        seriesId: series ?? undefined,
                        speakerId: speaker ?? undefined,
                        bookId: book ?? undefined,
                        congregationId: campusId,
                        from: from ?? undefined,
                        to: to ?? undefined,
                        sort,
                        order,
                        page,
                        perPage: config.perPage,
                    },
                },
            });
            if (error) throw new Error('Failed to fetch sermons');
            return data.data;
        },
    });
}

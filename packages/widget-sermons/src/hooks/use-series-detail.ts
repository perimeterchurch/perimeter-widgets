import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';
import { createApiError } from '../lib/api-error';

export function useSeriesDetail(id: number | null, config: SermonsConfig) {
    return useQuery({
        queryKey: ['series-detail', id],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/series/{id}',
                {
                    params: { path: { id: id! } },
                },
            );
            if (error)
                throw createApiError('Failed to fetch series detail', error);
            return data.data;
        },
        enabled: id !== null && id > 0,
    });
}

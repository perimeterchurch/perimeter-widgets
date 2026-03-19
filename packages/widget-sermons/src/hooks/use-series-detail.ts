import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SeriesDetail, SermonsConfig } from '../types';

export function useSeriesDetail(id: number | null, config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });
    return useQuery({
        queryKey: ['series-detail', id],
        queryFn: () => client.get<SeriesDetail>(`/api/sermons/series/${id}`),
        enabled: id !== null && id > 0,
    });
}

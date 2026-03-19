import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SeriesListItem, SermonsConfig } from '../types';

export function useSeries(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });
    return useQuery({
        queryKey: ['series-list'],
        queryFn: () => client.get<SeriesListItem[]>('/api/sermons/series'),
    });
}

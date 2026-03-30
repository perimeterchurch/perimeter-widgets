import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export function useSeries(config: SermonsConfig) {
    return useQuery({
        queryKey: ['series-list'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/series');
            if (error) throw new Error('Failed to fetch series');
            return data.data;
        },
    });
}

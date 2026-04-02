import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export function useServiceTypes(config: SermonsConfig) {
    return useQuery({
        queryKey: ['service-types'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/service-types',
            );
            if (error) throw new Error('Failed to fetch service types');
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

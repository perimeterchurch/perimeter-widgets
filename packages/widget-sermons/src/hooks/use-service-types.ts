import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export function useServiceTypes(config: SermonsConfig) {
    return useQuery({
        queryKey: ['service-types'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET(
                '/api/sermons/service-types',
            );
            if (error)
                throw createApiError('Failed to fetch service types', error);
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

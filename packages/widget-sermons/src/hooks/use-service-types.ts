import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig, ServiceType } from '../types';

export function useServiceTypes(config: SermonsConfig) {
    return useQuery({
        queryKey: ['service-types'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const response = await client.GET(
                '/api/sermons/service-types' as '/api/sermons',
            );
            if (response.error) throw new Error('Failed to fetch service types');
            return (response.data as unknown as { data: ServiceType[] }).data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

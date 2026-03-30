import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export function useSpeakers(config: SermonsConfig) {
    return useQuery({
        queryKey: ['speakers'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/speakers');
            if (error) throw new Error('Failed to fetch speakers');
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

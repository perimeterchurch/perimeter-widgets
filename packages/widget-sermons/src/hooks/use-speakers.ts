import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';
import { createApiError } from '../lib/api-error';

export function useSpeakers(config: SermonsConfig) {
    return useQuery({
        queryKey: ['speakers'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/speakers');
            if (error) throw createApiError('Failed to fetch speakers', error);
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

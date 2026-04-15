import { useQuery } from '@tanstack/react-query';
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../types';

export function useBooks(config: SermonsConfig) {
    return useQuery({
        queryKey: ['books'],
        queryFn: async () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            const { data, error } = await client.GET('/api/sermons/books');
            if (error) throw createApiError('Failed to fetch books', error);
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
    });
}

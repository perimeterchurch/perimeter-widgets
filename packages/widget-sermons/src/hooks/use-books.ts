import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Book, SermonsConfig } from '../types';

export function useBooks(config: SermonsConfig) {
    return useQuery({
        queryKey: ['books'],
        queryFn: () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            return client.get<Book[]>('/api/sermons/books');
        },
        staleTime: 30 * 60 * 1000,
    });
}

import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Book, SermonsConfig } from '../types';

export function useBooks(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });
    return useQuery({
        queryKey: ['books'],
        queryFn: () => client.get<Book[]>('/api/sermons/books'),
        staleTime: 30 * 60 * 1000,
    });
}

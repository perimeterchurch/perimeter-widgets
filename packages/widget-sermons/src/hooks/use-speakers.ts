import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Speaker, SermonsConfig } from '../types';

export function useSpeakers(config: SermonsConfig) {
    return useQuery({
        queryKey: ['speakers'],
        queryFn: () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            return client.get<Speaker[]>('/api/sermons/speakers');
        },
        staleTime: 10 * 60 * 1000,
    });
}

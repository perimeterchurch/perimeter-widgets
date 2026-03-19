import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Speaker, SermonsConfig } from '../types';

export function useSpeakers(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });
    return useQuery({
        queryKey: ['speakers'],
        queryFn: () => client.get<Speaker[]>('/api/sermons/speakers'),
        staleTime: 10 * 60 * 1000,
    });
}

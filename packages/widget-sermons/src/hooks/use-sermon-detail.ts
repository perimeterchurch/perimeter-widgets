import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonDetail, SermonsConfig } from '../types';

export function useSermonDetail(id: number | null, config: SermonsConfig) {
    return useQuery({
        queryKey: ['sermon-detail', id],
        queryFn: () => {
            const client = createApiClient({ baseUrl: config.apiUrl });
            return client.get<SermonDetail>(`/api/sermons/${id}`);
        },
        enabled: id !== null && id > 0,
    });
}

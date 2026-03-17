import { z } from 'zod';

/** Widget configuration from data-* attributes */
export const SermonsConfigSchema = z.object({
    campus: z.string().optional(),
    perPage: z.number().default(12),
    apiUrl: z.string().default('https://api.perimeter.org'),
});

export type SermonsConfig = z.infer<typeof SermonsConfigSchema>;

/** Placeholder types — will be replaced with real types from MP schema */
export interface Sermon {
    id: number;
    title: string;
    speaker: string;
    date: string;
    seriesId?: number;
    seriesName?: string;
    description?: string;
    videoUrl?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
}

export interface SermonSeries {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    sermonCount: number;
}

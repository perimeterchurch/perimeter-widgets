import type {
    Sermon,
    SermonSeries,
} from '@perimeter-widgets/widget-sermons/types';

export const mockSeries: SermonSeries[] = [
    {
        id: 1,
        name: 'The Gospel of John',
        description: 'A verse-by-verse study through the Gospel of John.',
        imageUrl: 'https://placehold.co/600x400?text=Gospel+of+John',
        sermonCount: 12,
    },
    {
        id: 2,
        name: 'Psalms of Praise',
        description: 'Exploring the Psalms and their relevance today.',
        imageUrl: 'https://placehold.co/600x400?text=Psalms',
        sermonCount: 8,
    },
];

export const mockSermons: Sermon[] = [
    {
        id: 1,
        title: 'In the Beginning Was the Word',
        speaker: 'Pastor John Smith',
        date: '2026-03-15',
        seriesId: 1,
        seriesName: 'The Gospel of John',
        description: 'An introduction to the Gospel of John.',
        videoUrl: 'https://example.com/video/1',
        audioUrl: 'https://example.com/audio/1',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+1',
    },
    {
        id: 2,
        title: 'The Light Shines in the Darkness',
        speaker: 'Pastor John Smith',
        date: '2026-03-08',
        seriesId: 1,
        seriesName: 'The Gospel of John',
        description: 'John 1:5 - The light shines in the darkness.',
        videoUrl: 'https://example.com/video/2',
        audioUrl: 'https://example.com/audio/2',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+2',
    },
    {
        id: 3,
        title: 'Praise the Lord, O My Soul',
        speaker: 'Pastor Jane Doe',
        date: '2026-03-01',
        seriesId: 2,
        seriesName: 'Psalms of Praise',
        description: 'A look at Psalm 103.',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+3',
    },
];

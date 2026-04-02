import type {
    SermonListItem,
    SermonDetail,
    SeriesListItem,
    Speaker,
    Book,
    ServiceType,
} from '@perimeter-widgets/widget-sermons/types';

export const mockSpeakers: Speaker[] = [
    {
        id: 1,
        name: 'Pastor John Smith',
        bio: 'Senior Pastor at Perimeter Church since 2010.',
    },
    { id: 2, name: 'Pastor Jane Doe', bio: 'Teaching Pastor and author.' },
];

export const mockServiceTypes: ServiceType[] = [
    { id: 1, name: 'Worship Service' },
    { id: 2, name: 'Youth' },
    { id: 3, name: 'Kids' },
    { id: 4, name: 'Special Event' },
];

export const mockBooks: Book[] = [
    { id: 60, name: '1 Peter' },
    { id: 42, name: 'Luke' },
    { id: 59, name: 'James' },
];

export const mockSeries: SeriesListItem[] = [
    {
        id: 1,
        title: '1 Peter',
        displayTitle: '1 Peter',
        subtitle: 'A Dangerous Hope',
        description: 'A verse-by-verse study through the book of 1 Peter.',
        latestSermonDate: '2026-03-15',
        sermonCount: 3,
        book: { id: 60, name: '1 Peter' },
    },
    {
        id: 2,
        title: 'Gospel of Luke',
        displayTitle: 'Gospel of Luke',
        subtitle: 'Following Jesus',
        description: 'Exploring the life and teachings of Jesus through Luke.',
        latestSermonDate: '2026-03-01',
        sermonCount: 2,
        book: { id: 42, name: 'Luke' },
    },
];

export const mockSermons: SermonListItem[] = [
    {
        id: 1,
        title: 'A Dangerous Hope',
        subtitle: null,
        shortDescription:
            'The Hope of Submission — exploring what it means to live under authority.',
        date: '2026-03-15',
        bannerUrl: null,
        speaker: { id: 1, name: 'Pastor John Smith' },
        series: { id: 1, title: '1 Peter' },
        congregation: { id: 1 },
        book: { id: 60, name: '1 Peter' },
    },
    {
        id: 2,
        title: 'Living Stones',
        subtitle: null,
        shortDescription: 'You are being built into a spiritual house.',
        date: '2026-03-08',
        bannerUrl: null,
        speaker: { id: 1, name: 'Pastor John Smith' },
        series: { id: 1, title: '1 Peter' },
        congregation: { id: 1 },
        book: { id: 60, name: '1 Peter' },
    },
    {
        id: 3,
        title: 'The Cost of Following',
        subtitle: null,
        shortDescription: 'What does it really cost to follow Jesus?',
        date: '2026-03-01',
        bannerUrl: null,
        speaker: { id: 2, name: 'Pastor Jane Doe' },
        series: { id: 2, title: 'Gospel of Luke' },
        congregation: { id: 1 },
        book: { id: 42, name: 'Luke' },
    },
];

export const mockSermonDetail: SermonDetail = {
    ...mockSermons[0]!,
    description:
        '<p>The Hope of Submission — exploring what it means to live under authority while maintaining hope in a world that often feels hostile to faith.</p>',
    transcript: null,
    scriptureLinks: '1 Peter 2:11-3:12',
    book: { id: 60, name: '1 Peter' },
    speaker: mockSpeakers[0]!,
    links: [
        {
            id: 1,
            url: 'https://vimeo.com/example/1',
            type: 'Watch',
            mediaType: 'video',
            duration: '38:22',
            position: 1,
        },
        {
            id: 2,
            url: 'https://example.com/audio/1.mp3',
            type: 'Listen',
            mediaType: 'audio',
            duration: '38:22',
            position: 2,
        },
    ],
};

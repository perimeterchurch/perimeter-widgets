/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SermonGrid } from '../../components/sermons/SermonGrid';

const mockSermons = [
    {
        id: 1,
        title: 'Amazing Grace',
        subtitle: null,
        date: '2026-01-15',
        shortDescription: 'A sermon about grace',
        bannerUrl: null,
        speaker: { id: 1, name: 'John Smith' },
        series: { id: 1, title: 'Grace Series' },
        congregation: { id: 1 },
        book: { id: 1, name: 'Ephesians' },
    },
    {
        id: 2,
        title: 'Walking in Faith',
        subtitle: null,
        date: '2026-01-22',
        shortDescription: 'A sermon about faith',
        bannerUrl: null,
        speaker: { id: 2, name: 'Jane Doe' },
        series: { id: 2, title: 'Faith Series' },
        congregation: { id: 1 },
        book: null,
    },
];

describe('SermonGrid', () => {
    it('renders sermon cards with titles', () => {
        render(
            <SermonGrid
                sermons={mockSermons}
                onSermonClick={() => {}}
            />,
        );

        expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
        expect(screen.getByText('Walking in Faith')).toBeInTheDocument();
    });

    it('displays speaker names', () => {
        render(
            <SermonGrid
                sermons={mockSermons}
                onSermonClick={() => {}}
            />,
        );

        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('shows empty state when no sermons', () => {
        render(
            <SermonGrid
                sermons={[]}
                onSermonClick={() => {}}
            />,
        );

        expect(screen.getByText('No sermons found.')).toBeInTheDocument();
    });

    it('calls onSermonClick with sermon ID', async () => {
        const onClick = vi.fn();

        render(
            <SermonGrid
                sermons={mockSermons}
                onSermonClick={onClick}
            />,
        );

        await userEvent.click(screen.getByText('Amazing Grace'));

        expect(onClick).toHaveBeenCalledWith(1);
    });
});

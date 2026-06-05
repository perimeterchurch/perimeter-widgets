/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SermonGrid } from '../../src/components/sermons/SermonGrid';
import { SermonsConfigSchema } from '../../src/types';

// SermonGrid reads config.apiUrl for the image URL fallback; tests don't
// care about the value, so we hand it a default-parsed config as a prop
// (legacy's useConfig() provider is not reproduced in the new platform).
const config = SermonsConfigSchema.parse({});

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
    render(<SermonGrid sermons={mockSermons} onSermonClick={() => {}} config={config} />);

    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('Walking in Faith')).toBeInTheDocument();
  });

  it('displays speaker names', () => {
    render(<SermonGrid sermons={mockSermons} onSermonClick={() => {}} config={config} />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows a themed empty state when no sermons', () => {
    const { container } = render(
      <SermonGrid sermons={[]} onSermonClick={() => {}} config={config} />,
    );

    expect(container.querySelector('[data-slot="results-empty"]')).not.toBeNull();
    expect(screen.getByText('No sermons found')).toBeInTheDocument();
  });

  it('calls onSermonClick with sermon ID', async () => {
    const onClick = vi.fn();

    render(<SermonGrid sermons={mockSermons} onSermonClick={onClick} config={config} />);

    await userEvent.click(screen.getByText('Amazing Grace'));

    expect(onClick).toHaveBeenCalledWith(1);
  });

  // Container-query reflow: the grid must use explicit arbitrary container
  // breakpoints (`@[<rem>]:`) the v0.1.1 @tailwindcss/container-queries plugin
  // actually emits CSS for — `@min-[…]:` emits nothing. happy-dom can't do real
  // CQ layout, so this only guards the class attribute; the 1/2/3-col reflow is
  // a manual studio check.
  it('reflows by container width via explicit @[…] breakpoints', () => {
    const { container } = render(
      <SermonGrid sermons={mockSermons} onSermonClick={() => {}} config={config} />,
    );
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-1', '@[30rem]:grid-cols-2', '@[48rem]:grid-cols-3');
  });
});

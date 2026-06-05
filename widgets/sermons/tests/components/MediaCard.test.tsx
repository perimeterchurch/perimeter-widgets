/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaCard } from '../../src/components/ui/MediaCard';

/**
 * The four-corner slots as the sermon views wire them:
 *   topLeft = date, topRight = series pill, bottomLeft = speaker, bottomRight = book.
 * Structure-only assertions (no geometry) per the jsdom/happy-dom constraint.
 */
const slots = {
  title: 'Amazing Grace',
  topLeft: <span>Jan 15, 2026</span>,
  topRight: <span data-testid="series-pill">Grace Series</span>,
  bottomLeft: <span>John Smith</span>,
  bottomRight: <span>Ephesians</span>,
};

describe('MediaCard grid scan order', () => {
  it('renders the title before the meta row in the corners layout', () => {
    render(<MediaCard viewMode="grid" imageUrl="" imageAlt="" onClick={() => {}} {...slots} />);

    const title = screen.getByText('Amazing Grace');
    const date = screen.getByText('Jan 15, 2026');
    // Title precedes the date·speaker meta row in DOM order.
    expect(title.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('places the series pill after the meta row (date · speaker)', () => {
    render(<MediaCard viewMode="grid" imageUrl="" imageAlt="" onClick={() => {}} {...slots} />);

    const speaker = screen.getByText('John Smith');
    const pill = screen.getByTestId('series-pill');
    // The series pill is pinned to the bottom, after the speaker meta item.
    expect(speaker.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('MediaCard compact list legibility', () => {
  it('keeps date + speaker but drops the series pill and book so slots do not run together', () => {
    render(<MediaCard viewMode="list" imageUrl="" imageAlt="" onClick={() => {}} {...slots} />);

    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    // Trimmed out of the compact line to stay legible.
    expect(screen.queryByTestId('series-pill')).toBeNull();
    expect(screen.queryByText('Ephesians')).toBeNull();
  });
});

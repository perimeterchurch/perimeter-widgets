/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaCard } from '../../src/components/ui/MediaCard';

/**
 * The four-corner slots as the sermon views wire them:
 *   topLeft = date, topRight = series, bottomLeft = speaker, bottomRight = book.
 * Structure-only assertions (no geometry) per the jsdom/happy-dom constraint.
 */
const slots = {
  title: 'Amazing Grace',
  description: 'A sermon about grace',
  topLeft: <span>Jan 15, 2026</span>,
  topRight: <span data-testid="series">Grace Series</span>,
  bottomLeft: <span>John Smith</span>,
  bottomRight: <span>Book: Ephesians</span>,
};

function expectDocumentOrder(elements: HTMLElement[]) {
  elements.slice(1).forEach((el, i) => {
    expect(
      elements[i]!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
}

describe('MediaCard grid bands', () => {
  it('reads title, series, date, speaker, description, then book', () => {
    render(<MediaCard viewMode="grid" imageUrl="" imageAlt="" onClick={() => {}} {...slots} />);

    expectDocumentOrder(
      [
        'Amazing Grace',
        'Grace Series',
        'Jan 15, 2026',
        'John Smith',
        'A sermon about grace',
        'Book: Ephesians',
      ].map((text) => screen.getByText(text)),
    );
  });

  it('keeps the same order in the list', () => {
    render(<MediaCard viewMode="list" imageUrl="" imageAlt="" onClick={() => {}} {...slots} />);

    expectDocumentOrder(
      ['Amazing Grace', 'Grace Series', 'Jan 15, 2026', 'John Smith', 'Book: Ephesians'].map(
        (text) => screen.getByText(text),
      ),
    );
  });
});

describe('MediaCard click targets', () => {
  it('opens from the title and the image, not from the rest of the card', () => {
    const onClick = vi.fn();
    const { container } = render(
      <MediaCard viewMode="grid" imageUrl="x.jpg" imageAlt="art" onClick={onClick} {...slots} />,
    );

    // The card is a container, so the meta slots can hold their own links.
    expect(container.querySelector('article')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Amazing Grace' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('A sermon about grace'));
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Amazing Grace' }));
    fireEvent.click(screen.getByAltText('art'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('MediaCard roomy row', () => {
  it('shows title, date · speaker and description, and leaves out the series and book', () => {
    const onClick = vi.fn();
    render(
      <MediaCard viewMode="row" imageUrl="x.jpg" imageAlt="art" onClick={onClick} {...slots} />,
    );

    expectDocumentOrder(
      ['Amazing Grace', 'Jan 15, 2026', 'John Smith', 'A sermon about grace'].map((text) =>
        screen.getByText(text),
      ),
    );
    // Every row in "More from this series" shares the series.
    expect(screen.queryByTestId('series')).toBeNull();
    expect(screen.queryByText('Book: Ephesians')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Amazing Grace' }));
    fireEvent.click(screen.getByAltText('art'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

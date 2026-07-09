/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';
import { EventFinderConfigSchema, type EventFinderConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function queryResult(events: unknown[] | null, overrides: Record<string, unknown> = {}) {
  return {
    data: events === null ? undefined : { success: true, data: { events } },
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    ...overrides,
  };
}

const EVENT = {
  id: 52041,
  title: 'Officer Leadership Meeting',
  description: '<p>Meeting in the <strong>Chapel</strong>.</p>',
  location: 'Chapel',
  startDate: '2030-09-13T18:00:00',
  endDate: '2030-09-13T21:00:00',
  detailType: 'Free',
  detailsUrl: 'https://www.perimeter.org/event-details-free/?id=52041',
};

const hooks = vi.hoisted<{ result: unknown }>(() => ({ result: undefined }));

vi.mock('@perimeter/api-hooks', () => ({
  useEvents: () => hooks.result,
}));

function renderApp(overrides: Record<string, unknown> = {}) {
  const config: EventFinderConfig = EventFinderConfigSchema.parse({
    listId: '18,208',
    ...overrides,
  });
  return render(<App config={config} />);
}

describe('event-finder App', () => {
  it('renders event title, default date/time, and location', () => {
    hooks.result = queryResult([EVENT]);
    renderApp();
    expect(screen.getByText('Officer Leadership Meeting')).toBeInTheDocument();
    expect(screen.getByText(/Sep 13, 2030 · 6:00 PM – 9:00 PM/)).toBeInTheDocument();
    expect(screen.getByText('Chapel')).toBeInTheDocument();
  });

  it('uses the compact alternate date format when altDate is set', () => {
    hooks.result = queryResult([EVENT]);
    renderApp({ altDate: true });
    expect(screen.getByText('Fri | September 13 | 6:00 PM')).toBeInTheDocument();
  });

  it('shows the details link only when showDetails and a detailsUrl exist', () => {
    hooks.result = queryResult([EVENT]);
    renderApp({ showDetails: true });
    const link = screen.getByRole('link', { name: 'See Details' });
    expect(link).toHaveAttribute('href', EVENT.detailsUrl);
  });

  it('hides the details link when the event has no detailsUrl', () => {
    hooks.result = queryResult([{ ...EVENT, detailType: null, detailsUrl: null }]);
    renderApp({ showDetails: true });
    expect(screen.queryByRole('link', { name: 'See Details' })).toBeNull();
  });

  it('renders the HTML description only when showDescription is set', () => {
    hooks.result = queryResult([EVENT]);
    const { rerender } = renderApp({ showDescription: false });
    expect(screen.queryByText('Chapel', { selector: 'strong' })).toBeNull();

    rerender(
      <App config={EventFinderConfigSchema.parse({ listId: '18', showDescription: true })} />,
    );
    expect(screen.getByText('Chapel', { selector: 'strong' })).toBeInTheDocument();
  });

  it('renders event images only when showImages is set', () => {
    hooks.result = queryResult([EVENT]);
    const { container, rerender } = renderApp({ showImages: false });
    expect(container.querySelector('img')).toBeNull();

    rerender(<App config={EventFinderConfigSchema.parse({ listId: '18', showImages: true })} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('/api/event-image/52041');
  });

  it('shows a config message when no listId is set', () => {
    hooks.result = queryResult([]);
    renderApp({ listId: '' });
    expect(screen.getByText(/no event list configured/i)).toBeInTheDocument();
  });

  it('shows the empty message when the list has no events', () => {
    hooks.result = queryResult([]);
    renderApp({ emptyMessage: 'Nothing scheduled.' });
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });

  it('shows a loading state while fetching', () => {
    hooks.result = queryResult(null, { isLoading: true, isSuccess: false });
    const { container } = renderApp();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows an error state on failure', () => {
    hooks.result = queryResult(null, { isError: true, isSuccess: false });
    renderApp();
    expect(screen.getByText(/unable to load events/i)).toBeInTheDocument();
  });
});

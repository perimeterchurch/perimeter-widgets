/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';
import { MissionTripFinderConfigSchema, type MissionTripFinderConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function queryResult(trips: unknown[] | null, overrides: Record<string, unknown> = {}) {
  return {
    data: trips === null ? undefined : { success: true, data: { trips } },
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    ...overrides,
  };
}

const TRIP = {
  id: 948,
  name: 'Ghana Hope Performance Tennis',
  destination: 'Ghana',
  destinationId: 7,
  description: 'Lead tennis clinics and mentorship sessions in Accra.',
  bannerUrl: 'https://cdn.example.org/ghana_banner.jpg',
  startDate: '2026-07-08T06:46:00',
  endDate: '2026-07-17T06:47:00',
  registrationEndDate: '2026-08-17T06:46:00',
  cost: 3500,
  registrantCount: 8,
  maximumRegistrants: 11,
  registrationFull: false,
  invitationOnly: false,
};

const hooks = vi.hoisted<{ result: unknown; params: unknown }>(() => ({
  result: undefined,
  params: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useMissionTrips: (params: unknown) => {
    hooks.params = params;
    return hooks.result;
  },
}));

function config(overrides: Record<string, unknown> = {}): MissionTripFinderConfig {
  return MissionTripFinderConfigSchema.parse(overrides);
}

function renderApp(overrides: Record<string, unknown> = {}) {
  return render(<App config={config(overrides)} />);
}

describe('mission-trip-finder App', () => {
  it('renders the trip name, destination, dates, and cost', () => {
    hooks.result = queryResult([TRIP]);
    renderApp();
    expect(screen.getByText('Ghana Hope Performance Tennis')).toBeInTheDocument();
    expect(screen.getByText('Ghana')).toBeInTheDocument();
    expect(screen.getByText('July 8 – July 17, 2026')).toBeInTheDocument();
    expect(screen.getByText('$3,500')).toBeInTheDocument();
  });

  it('links the whole card to the go-journey details page for that trip', () => {
    hooks.result = queryResult([TRIP]);
    renderApp();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.perimeter.org/global-outreach/go-journey-details/?id=948',
    );
  });

  it('honours a custom details URL base', () => {
    hooks.result = queryResult([TRIP]);
    renderApp({ detailsUrlBase: 'https://example.org/trip/' });
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.org/trip/948');
  });

  it('badges a full trip', () => {
    hooks.result = queryResult([{ ...TRIP, registrationFull: true }]);
    renderApp();
    expect(screen.getByText('Registration Full')).toBeInTheDocument();
  });

  it('badges an invitation-only trip', () => {
    hooks.result = queryResult([{ ...TRIP, invitationOnly: true }]);
    renderApp();
    expect(screen.getByText('Invitation Only')).toBeInTheDocument();
  });

  it('shows no badges on an open, public trip', () => {
    hooks.result = queryResult([TRIP]);
    renderApp();
    expect(screen.queryByText('Registration Full')).toBeNull();
    expect(screen.queryByText('Invitation Only')).toBeNull();
  });

  it('renders the destination banner with the destination as alt text', () => {
    hooks.result = queryResult([TRIP]);
    const { container } = renderApp();
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', TRIP.bannerUrl);
    expect(img).toHaveAttribute('alt', 'Ghana');
  });

  it('falls back to the configured default image when the destination has no banner', () => {
    hooks.result = queryResult([{ ...TRIP, bannerUrl: null }]);
    const { container } = renderApp({ defaultImageUrl: 'https://cdn.example.org/default.jpg' });
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.org/default.jpg',
    );
  });

  it('renders a placeholder when there is no banner and no fallback', () => {
    hooks.result = queryResult([{ ...TRIP, bannerUrl: null }]);
    const { container } = renderApp();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows the description by default and hides it when turned off', () => {
    hooks.result = queryResult([TRIP]);
    const { rerender } = renderApp();
    expect(screen.getByText(/Lead tennis clinics/)).toBeInTheDocument();

    rerender(<App config={config({ showDescription: false })} />);
    expect(screen.queryByText(/Lead tennis clinics/)).toBeNull();
  });

  it('hides the cost when showCost is off', () => {
    hooks.result = queryResult([TRIP]);
    renderApp({ showCost: false });
    expect(screen.queryByText('$3,500')).toBeNull();
  });

  it('shows remaining spots only when showSpots is on', () => {
    hooks.result = queryResult([TRIP]);
    const { rerender } = renderApp();
    expect(screen.queryByText('3 spots left')).toBeNull();

    rerender(<App config={config({ showSpots: true })} />);
    expect(screen.getByText('3 spots left')).toBeInTheDocument();
  });

  it('singularizes the last remaining spot', () => {
    hooks.result = queryResult([{ ...TRIP, registrantCount: 10 }]);
    renderApp({ showSpots: true });
    expect(screen.getByText('1 spot left')).toBeInTheDocument();
  });

  it('does not offer spots on a full trip', () => {
    hooks.result = queryResult([{ ...TRIP, registrantCount: 11, registrationFull: true }]);
    renderApp({ showSpots: true });
    expect(screen.queryByText(/spots? left/)).toBeNull();
  });

  it('omits dates entirely for an unscheduled trip', () => {
    hooks.result = queryResult([{ ...TRIP, startDate: null, endDate: null }]);
    renderApp();
    expect(screen.getByText('Ghana Hope Performance Tennis')).toBeInTheDocument();
    expect(screen.queryByText(/2026/)).toBeNull();
  });

  it('caps the list at maxTrips', () => {
    hooks.result = queryResult([TRIP, { ...TRIP, id: 949, name: 'Second Trip' }]);
    renderApp({ maxTrips: 1 });
    expect(screen.getByText('Ghana Hope Performance Tennis')).toBeInTheDocument();
    expect(screen.queryByText('Second Trip')).toBeNull();
  });

  it('asks the endpoint to drop full trips when hideFull is set', () => {
    hooks.result = queryResult([TRIP]);
    renderApp({ hideFull: true });
    expect(hooks.params).toMatchObject({ includeFull: 'false' });
  });

  it('requests only open trips by default', () => {
    hooks.result = queryResult([TRIP]);
    renderApp();
    expect(hooks.params).not.toHaveProperty('includePast');
  });

  it('passes destination and keyword filters through to the endpoint', () => {
    hooks.result = queryResult([TRIP]);
    renderApp({ includePast: true, destinationId: 7, keyword: 'ghana' });
    expect(hooks.params).toMatchObject({
      includePast: 'true',
      destinationId: 7,
      keyword: 'ghana',
    });
  });

  it('shows the empty message when there are no trips', () => {
    hooks.result = queryResult([]);
    renderApp({ emptyMessage: 'Check back soon.' });
    expect(screen.getByText('Check back soon.')).toBeInTheDocument();
  });

  it('shows a loading state while fetching', () => {
    hooks.result = queryResult(null, { isLoading: true, isSuccess: false });
    const { container } = renderApp();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows an error state on failure', () => {
    hooks.result = queryResult(null, { isError: true, isSuccess: false });
    renderApp();
    expect(screen.getByText(/unable to load mission trips/i)).toBeInTheDocument();
  });
});

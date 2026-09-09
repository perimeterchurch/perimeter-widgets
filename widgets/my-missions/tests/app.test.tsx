/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MyMissionTrip } from '@perimeter/api-hooks';
import { App } from '../src/app';
import { leaderTrip, pastTrip, trip } from './fixtures';

// The App reads live data through @perimeter/api-hooks, which needs an
// ApiClient + QueryClient context the test doesn't provide. Mock the module so
// each test drives one query state deterministically. ApiError is re-exported
// for real so the auth-specific error copy can be exercised.
const useMyMissionTrips = vi.fn();
const saveMutate = vi.fn();
vi.mock('@perimeter/api-hooks', () => ({
  useMyMissionTrips: () => useMyMissionTrips() as unknown,
  useSaveMissionLetter: () => ({ mutate: saveMutate, isPending: false, error: null }),
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
    get isAuthError(): boolean {
      return this.status === 401;
    }
  },
}));

const config = {
  title: 'My Missions',
  currentTitle: 'Current Trips',
  pastTitle: 'Past Trips',
  showPastTrips: true,
};

function loaded(trips: MyMissionTrip[]) {
  return {
    data: { data: { trips } },
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
  };
}

beforeEach(() => {
  useMyMissionTrips.mockReset();
  saveMutate.mockReset();
});

describe('my-missions widget App', () => {
  it('renders the configured title heading', () => {
    useMyMissionTrips.mockReturnValue(loaded([]));
    render(<App config={config} />);
    expect(screen.getByRole('heading', { name: 'My Missions', level: 2 })).toBeInTheDocument();
  });

  it('shows a loading state while the request is in flight', () => {
    useMyMissionTrips.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<App config={config} />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('keeps loading — never "no trips" — while a retry is paused offline', () => {
    // React Query reports fetchStatus 'paused' (pending, NOT fetching) when it
    // believes the browser is offline, so `isLoading` is false there. Guarding
    // on `isLoading` told a member on a flaky connection that they had no
    // mission trips.
    useMyMissionTrips.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<App config={config} />);

    expect(screen.queryByText(/no mission trips yet/i)).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows an empty state when the household has no trips', () => {
    useMyMissionTrips.mockReturnValue(loaded([]));
    render(<App config={config} />);
    expect(screen.getByText(/no mission trips yet/i)).toBeInTheDocument();
  });

  it('shows a generic error state when the request fails', () => {
    useMyMissionTrips.mockReturnValue({
      data: undefined,
      isPending: false,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });
    render(<App config={config} />);
    expect(screen.getByText(/unable to load your trips/i)).toBeInTheDocument();
  });

  it('separates current and past trips under their own headings', () => {
    useMyMissionTrips.mockReturnValue(loaded([trip(), pastTrip()]));
    render(<App config={config} />);
    expect(screen.getByRole('heading', { name: 'Current Trips' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Past Trips' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kenya Medical Journey/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Peru/ })).toBeInTheDocument();
  });

  it('hides the past-trips section when showPastTrips is off', () => {
    useMyMissionTrips.mockReturnValue(loaded([trip(), pastTrip()]));
    render(<App config={{ ...config, showPastTrips: false }} />);
    expect(screen.queryByRole('heading', { name: 'Past Trips' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Peru/ })).toBeNull();
  });

  it('keeps a trip collapsed until its row is activated', async () => {
    useMyMissionTrips.mockReturnValue(loaded([trip()]));
    render(<App config={config} />);

    const row = screen.getByRole('button', { name: /Kenya Medical Journey/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/My funds raised/)).toBeNull();

    await userEvent.click(row);

    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/My funds raised/)).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
  });

  it('collapses the open trip when another is opened (one at a time)', async () => {
    useMyMissionTrips.mockReturnValue(loaded([trip(), leaderTrip()]));
    render(<App config={config} />);

    const kenya = screen.getByRole('button', { name: /Kenya Medical Journey/ });
    const guatemala = screen.getByRole('button', { name: /Guatemala Build/ });

    await userEvent.click(kenya);
    expect(kenya).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(guatemala);
    expect(kenya).toHaveAttribute('aria-expanded', 'false');
    expect(guatemala).toHaveAttribute('aria-expanded', 'true');
  });

  it('offers the leader sections only on a trip the viewer leads', async () => {
    useMyMissionTrips.mockReturnValue(loaded([trip(), leaderTrip()]));
    render(<App config={config} />);

    await userEvent.click(screen.getByRole('button', { name: /Kenya Medical Journey/ }));
    expect(screen.queryByRole('button', { name: 'Trip Leader Resources' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Guatemala Build/ }));
    expect(screen.getByRole('button', { name: 'Trip Leader Resources' })).toBeInTheDocument();
  });

  it('lists participants and wires Email All Participants once leader resources are open', async () => {
    useMyMissionTrips.mockReturnValue(loaded([leaderTrip()]));
    render(<App config={config} />);

    await userEvent.click(screen.getByRole('button', { name: /Guatemala Build/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Trip Leader Resources' }));

    expect(screen.getByText('Nadia Oyelaran')).toBeInTheDocument();
    expect(screen.getByText('Tobias Achebe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email all participants/i })).toHaveAttribute(
      'href',
      'mailto:joseph@perimeter.org?bcc=nadia%40example.com%2Ctobias%40example.com',
    );
  });

  it('renders the donations table behind its disclosure', async () => {
    useMyMissionTrips.mockReturnValue(loaded([trip()]));
    render(<App config={config} />);

    await userEvent.click(screen.getByRole('button', { name: /Kenya Medical Journey/ }));
    await userEvent.click(screen.getByRole('button', { name: /Donations/ }));

    expect(screen.getByText('Marta Whitfield')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'marta@example.com' })).toHaveAttribute(
      'href',
      'mailto:marta@example.com',
    );
  });

  it('offers the letter on a current trip', async () => {
    useMyMissionTrips.mockReturnValue(loaded([trip()]));
    render(<App config={config} />);

    await userEvent.click(screen.getByRole('button', { name: /Kenya Medical Journey/ }));
    expect(screen.getByRole('button', { name: 'My Letter' })).toBeInTheDocument();
  });

  it('does not offer the letter on a finished trip', async () => {
    useMyMissionTrips.mockReturnValue(loaded([pastTrip()]));
    render(<App config={config} />);

    await userEvent.click(screen.getByRole('button', { name: /Peru/ }));
    expect(screen.queryByRole('button', { name: 'My Letter' })).toBeNull();
    // The rest of the panel is there — it's the letter specifically that's gone.
    expect(screen.getByText(/My funds raised/)).toBeInTheDocument();
  });

  it('tracks the open row per section, so a past trip does not close a current one', async () => {
    // Each section renders its own accordion, matching the legacy widget where
    // TripsAccordion was mounted once per section with its own expanded index.
    useMyMissionTrips.mockReturnValue(loaded([trip(), pastTrip()]));
    render(<App config={config} />);

    const kenya = screen.getByRole('button', { name: /Kenya Medical Journey/ });
    const peru = screen.getByRole('button', { name: /Peru/ });

    await userEvent.click(kenya);
    await userEvent.click(peru);

    expect(kenya).toHaveAttribute('aria-expanded', 'true');
    expect(peru).toHaveAttribute('aria-expanded', 'true');
  });
});

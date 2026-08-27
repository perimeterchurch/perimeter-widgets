/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app';
import { MissionTripFinderConfigSchema, type MissionTripFinderConfig } from '../src/types';

const TRIP = {
  id: 945,
  name: 'Guatemala Medical Missions',
  destination: 'Guatemala',
  destinationId: 1,
  description: 'Teaser.',
  bannerUrl: 'https://cdn.example.org/guatemala.jpg',
  startDate: '2026-07-25T00:00:00',
  endDate: '2026-08-01T00:00:00',
  registrationEndDate: '2026-09-01T00:00:00',
  cost: 2210,
  registrantCount: 2,
  maximumRegistrants: 25,
  registrationFull: false,
  invitationOnly: false,
  longDescription: '<p>About the trip.</p>',
  participants: [
    { pledgeId: 100223, name: 'Samantha and Jack Morgan' },
    { pledgeId: 100224, name: 'Jack Morgan' },
  ],
};

const PARTICIPANT = {
  pledgeId: 100223,
  tripId: 945,
  name: 'Samantha and Jack Morgan',
  firstName: 'Samantha',
  letter: '<p>Dear <em>friends</em>,</p>',
  raised: 1150,
  goal: 2210,
  tripLeader: false,
  facebookUrl: null,
  xUrl: null,
  instagramUrl: null,
};

const hooks = vi.hoisted<{ detail: unknown; participant: unknown; args: unknown }>(() => ({
  detail: undefined,
  participant: undefined,
  args: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useMissionTrips: () => ({
    data: { success: true, data: { trips: [TRIP] } },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useMissionTrip: () => hooks.detail,
  useMissionTripParticipant: (tripId: number, pledgeId: number) => {
    hooks.args = { tripId, pledgeId };
    return hooks.participant;
  },
}));

function config(overrides: Record<string, unknown> = {}): MissionTripFinderConfig {
  return MissionTripFinderConfigSchema.parse(overrides);
}

function renderApp(overrides: Record<string, unknown> = {}) {
  return render(<App config={config(overrides)} />);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  hooks.detail = { data: { success: true, data: TRIP }, isLoading: false, error: null };
  hooks.participant = {
    data: { success: true, data: PARTICIPANT },
    isLoading: false,
    error: null,
  };
  hooks.args = undefined;
});

describe('opening a participant', () => {
  it('opens their page from the team roster', async () => {
    renderApp({ tripId: 945 });

    const card = await waitFor(() =>
      screen.getByRole('button', { name: /View Samantha and Jack Morgan's page/ }),
    );
    await userEvent.click(card);

    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(hooks.args).toEqual({ tripId: 945, pledgeId: 100223 });
  });

  it('writes the pledge to the URL on an unpinned embed', async () => {
    window.history.replaceState(null, '', '/?trip-screen=detail&trip-id=945');
    renderApp();

    const card = await waitFor(() =>
      screen.getByRole('button', { name: /View Samantha and Jack Morgan's page/ }),
    );
    await userEvent.click(card);

    await waitFor(() => expect(window.location.search).toContain('trip-pledge=100223'));
  });

  it('does not write to the URL on a pinned embed — the host page owns it', async () => {
    renderApp({ tripId: 945 });

    const card = await waitFor(() =>
      screen.getByRole('button', { name: /View Samantha and Jack Morgan's page/ }),
    );
    await userEvent.click(card);

    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(window.location.search).toBe('');
  });

  it('boots straight to a participant from data-pledge-id', async () => {
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(hooks.args).toEqual({ tripId: 945, pledgeId: 100223 });
  });

  it('links team cards out instead when participantUrl is configured', async () => {
    renderApp({
      tripId: 945,
      participantUrl: 'https://example.org/p?pledge={pledgeId}',
    });

    await waitFor(() => expect(screen.getByText('Samantha and Jack Morgan')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Samantha and Jack Morgan/ })).toHaveAttribute(
      'href',
      'https://example.org/p?pledge=100223',
    );
    expect(
      screen.queryByRole('button', { name: /View Samantha and Jack Morgan's page/ }),
    ).not.toBeInTheDocument();
  });
});

describe('participant page content', () => {
  beforeEach(() => {
    renderApp({ tripId: 945, pledgeId: 100223 });
  });

  it('shows the eyebrow, name and photo', async () => {
    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Samantha and Jack Morgan' })).toBeInTheDocument();
    expect(screen.getByAltText('Samantha and Jack Morgan')).toHaveAttribute(
      'src',
      expect.stringContaining('/api/mission-trips/945/participant/100223/image'),
    );
  });

  // Most of the roster has no photo on file, so the image 404s and this is the
  // common path, not an edge case. The branded mark has to replace the portrait
  // without leaving a second, redundant accessible name behind it.
  it('falls back to the branded mark when the photo 404s', async () => {
    const photo = await waitFor(() => screen.getByAltText('Samantha and Jack Morgan'));
    fireEvent.error(photo);

    expect(screen.queryByAltText('Samantha and Jack Morgan')).not.toBeInTheDocument();
    const mark = document.querySelector('img[src^="data:image/png;base64,"]');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('alt', '');
    // The name is still announced once, by the heading.
    expect(screen.getByRole('heading', { name: 'Samantha and Jack Morgan' })).toBeInTheDocument();
  });

  it('renders progress as a real <progress>, announced with its figures', async () => {
    const bar = await waitFor(() =>
      screen.getByRole('progressbar', { name: /\$1,150 raised of a \$2,210 goal/ }),
    );
    // A decorative pair of divs would announce nothing at all.
    expect(bar).toHaveAttribute('value', '1150');
    expect(bar).toHaveAttribute('max', '2210');
    expect(screen.getByText('Raised: $1,150')).toBeInTheDocument();
    expect(screen.getByText('Goal: $2,210')).toBeInTheDocument();
  });

  it('uses the first name alone on the support button', async () => {
    // "Support Samantha and Jack Morgan" would be wrong on a button.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Support Samantha' })).toBeInTheDocument(),
    );
  });

  it('points the support button at the giving form with the pledge attached', async () => {
    const link = await waitFor(() => screen.getByRole('link', { name: 'Support Samantha' }));
    expect(link).toHaveAttribute(
      'href',
      'https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id=945&mp_pledge_id=100223#!/',
    );
  });

  it('renders the letter as sanitized HTML', async () => {
    await waitFor(() => expect(screen.getByText('friends')).toBeInTheDocument());
    expect(screen.getByText('friends').tagName).toBe('EM');
  });

  it('replaces the lower page — no testimonials, roster or disclaimer', async () => {
    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(screen.queryByText('Hear From Others')).not.toBeInTheDocument();
    expect(screen.queryByText('Meet the Team')).not.toBeInTheDocument();
    expect(screen.queryByText('Donation Disclaimer')).not.toBeInTheDocument();
    expect(screen.queryByText('About the Journey')).not.toBeInTheDocument();
  });

  it('keeps the trip heading and photo scroller above it', async () => {
    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Guatemala Medical Missions' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Photos from/ })).toBeInTheDocument();
  });

  it('returns to the trip via View Trip Details', async () => {
    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /View Trip Details/ }));

    await waitFor(() => expect(screen.getByText('About the Journey')).toBeInTheDocument());
    expect(screen.queryByText('GO Journey Participant')).not.toBeInTheDocument();
  });
});

describe('participant edge cases', () => {
  it('strips script tags out of the letter', async () => {
    hooks.participant = {
      data: {
        success: true,
        data: { ...PARTICIPANT, letter: '<p>Safe</p><script>window.__x = 1;</script>' },
      },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('Safe')).toBeInTheDocument());
    expect(document.querySelector('script')).toBeNull();
  });

  it('omits the bar when the campaign has no goal to measure against', async () => {
    hooks.participant = {
      data: { success: true, data: { ...PARTICIPANT, goal: null } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows a zeroed bar for someone who has raised nothing yet', async () => {
    hooks.participant = {
      data: { success: true, data: { ...PARTICIPANT, raised: 0 } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('Raised: $0')).toBeInTheDocument());
  });

  it('renders without a letter, which is the common case', async () => {
    hooks.participant = {
      data: { success: true, data: { ...PARTICIPANT, letter: null } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('GO Journey Participant')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Support Samantha' })).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', async () => {
    hooks.participant = {
      data: { success: true, data: { ...PARTICIPANT, firstName: null } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: 'Support Samantha and Jack Morgan' }),
      ).toBeInTheDocument(),
    );
  });

  it('offers a way back when the participant does not resolve', async () => {
    hooks.participant = { data: undefined, isLoading: false, error: new Error('404') };
    renderApp({ tripId: 945, pledgeId: 100223 });

    await waitFor(() => expect(screen.getByText('Participant not found')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /View Trip Details/ })).toBeInTheDocument();
  });
});

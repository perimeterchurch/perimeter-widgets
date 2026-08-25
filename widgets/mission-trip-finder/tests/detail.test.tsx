/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app';
import { MissionTripFinderConfigSchema, type MissionTripFinderConfig } from '../src/types';

const TRIP = {
  id: 958,
  name: 'Serving students at Mana De Vida',
  destination: 'Guatemala',
  destinationId: 1,
  description: 'Come one, come all!',
  bannerUrl: 'https://cdn.example.org/guatemala.jpg',
  startDate: '2026-07-11T16:34:00',
  endDate: '2026-07-18T16:35:00',
  registrationEndDate: '2026-08-11T16:34:00',
  cost: 2400,
  registrantCount: 11,
  maximumRegistrants: 25,
  registrationFull: false,
  invitationOnly: false,
};

const DETAIL = {
  ...TRIP,
  longDescription: '<p>Come <em>one</em>, come all!</p>',
  participants: [
    { pledgeId: 97540, name: 'Lori Allison' },
    { pledgeId: 99930, name: 'Sue and Brett Swanson' },
  ],
};

const hooks = vi.hoisted<{ list: unknown; detail: unknown; detailId: number | undefined }>(() => ({
  list: undefined,
  detail: undefined,
  detailId: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useMissionTrips: () => hooks.list,
  useMissionTrip: (id: number) => {
    hooks.detailId = id;
    return hooks.detail;
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
  hooks.list = {
    data: { success: true, data: { trips: [TRIP] } },
    isLoading: false,
    isError: false,
    error: null,
  };
  hooks.detail = {
    data: { success: true, data: DETAIL },
    isLoading: false,
    error: null,
  };
  hooks.detailId = undefined;
});

describe('trip detail navigation', () => {
  it('opens the detail in place when a card is clicked', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /Mana De Vida/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument());
    expect(hooks.detailId).toBe(958);
  });

  it('writes the open trip to the URL so it is a shareable deep link', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /Mana De Vida/ }));

    await waitFor(() => {
      expect(window.location.search).toContain('trip-screen=detail');
      expect(window.location.search).toContain('trip-id=958');
    });
  });

  it('goes back to the list', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /Mana De Vida/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
  });

  it('restores the detail from the URL on load', async () => {
    window.history.replaceState(null, '', '/?trip-screen=detail&trip-id=958');
    renderApp();

    await waitFor(() => expect(hooks.detailId).toBe(958));
  });

  it('namespaces its URL keys so two embeds on a page do not collide', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /Mana De Vida/ }));

    await waitFor(() => expect(window.location.search).toContain('trip-id=958'));
    // Bare `id=`/`screen=` would be claimed by whichever widget wrote last.
    expect(window.location.search).not.toMatch(/[?&]id=/);
    expect(window.location.search).not.toMatch(/[?&]screen=/);
  });
});

describe('tripId-pinned embed', () => {
  it('renders the detail with no list behind it and no Back button', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(hooks.detailId).toBe(958);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('does not write to the URL — the host page owns it', async () => {
    renderApp({ tripId: 958 });
    await waitFor(() => expect(hooks.detailId).toBe(958));
    expect(window.location.search).toBe('');
  });
});

describe('trip detail content', () => {
  it('renders the long description as sanitized HTML, not escaped text', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() => expect(screen.getByText('one')).toBeInTheDocument());
    // The <em> survived, so this went through the sanitizer as markup rather
    // than being printed literally.
    expect(screen.getByText('one').tagName).toBe('EM');
  });

  it('strips script tags out of the long description', async () => {
    hooks.detail = {
      data: {
        success: true,
        data: {
          ...DETAIL,
          longDescription: '<p>Safe</p><script>window.__pwned = true;</script>',
        },
      },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 958 });

    await waitFor(() => expect(screen.getByText('Safe')).toBeInTheDocument());
    expect(document.querySelector('script')).toBeNull();
  });

  it('renders the team roster', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() => expect(screen.getByText('Meet the Team')).toBeInTheDocument());
    expect(screen.getByText('Lori Allison')).toBeInTheDocument();
    // A Beneficiary row carries a couple, which a single contact cannot express.
    expect(screen.getByText('Sue and Brett Swanson')).toBeInTheDocument();
  });

  it('points each avatar at the trip-scoped photo route', async () => {
    renderApp({ tripId: 958, apiUrl: 'https://api.example.org' });

    await waitFor(() => expect(screen.getByAltText('Lori Allison')).toBeInTheDocument());
    expect(screen.getByAltText('Lori Allison')).toHaveAttribute(
      'src',
      'https://api.example.org/api/mission-trips/958/participant/97540/image',
    );
  });

  it('hides the roster when showTeam is off', async () => {
    renderApp({ tripId: 958, showTeam: '' });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Meet the Team')).not.toBeInTheDocument();
  });

  it('leaves team cards unlinked until participantUrl is configured', async () => {
    renderApp({ tripId: 958 });
    await waitFor(() => expect(screen.getByText('Lori Allison')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Lori Allison/ })).not.toBeInTheDocument();
  });

  it('links team cards when participantUrl is configured', async () => {
    renderApp({
      tripId: 958,
      participantUrl: 'https://example.org/p?trip={id}&pledge={pledgeId}',
    });

    await waitFor(() => expect(screen.getByText('Lori Allison')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Lori Allison/ })).toHaveAttribute(
      'href',
      'https://example.org/p?trip=958&pledge=97540',
    );
  });

  it('renders both CTAs against the legacy destinations', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Register to Join' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Register to Join' })).toHaveAttribute(
      'href',
      expect.stringContaining('pledgecampaignid=958'),
    );
    expect(screen.getByRole('link', { name: 'Support Journey' })).toHaveAttribute(
      'href',
      'https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id=958#!/',
    );
  });

  it('drops Register on a full trip but keeps Support', async () => {
    hooks.detail = {
      data: { success: true, data: { ...DETAIL, registrationFull: true } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Support Journey' })).toBeInTheDocument(),
    );
    // Registering for a full trip is a dead end; supporting it is not.
    expect(screen.queryByRole('link', { name: 'Register to Join' })).not.toBeInTheDocument();
  });

  it('drops Register on an invitation-only trip', async () => {
    hooks.detail = {
      data: { success: true, data: { ...DETAIL, invitationOnly: true } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Support Journey' })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: 'Register to Join' })).not.toBeInTheDocument();
  });

  it('shows the donation disclaimer, and hides it when blanked', async () => {
    const { unmount } = renderApp({ tripId: 958 });
    await waitFor(() => expect(screen.getByText('Donation Disclaimer')).toBeInTheDocument());
    unmount();

    renderApp({ tripId: 958, disclaimerText: '' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Donation Disclaimer')).not.toBeInTheDocument();
  });

  it('shows a not-found state when the trip does not resolve', async () => {
    hooks.detail = { data: undefined, isLoading: false, error: new Error('404') };
    renderApp({ tripId: 958 });

    await waitFor(() => expect(screen.getByText('Trip not found')).toBeInTheDocument());
  });
});

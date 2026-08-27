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
  // `detailsMode: 'inline'` on every render here: link mode is the default so a
  // release cannot change a live embed, but these specs are about the in-place
  // detail, which an embed opts into.
  return render(<App config={config({ detailsMode: 'inline', ...overrides })} />);
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

  it('keeps the fundraising goal off the detail, where it read as a price tag', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Support Journey' })).toBeInTheDocument(),
    );
    // $2,400 is on the card; above the CTAs it looked like the cost of
    // pressing "Register to Join". showCost still governs the card.
    expect(screen.queryByText(/\$2,400/)).not.toBeInTheDocument();
  });

  it('still shows spots left when showSpots is on', async () => {
    renderApp({ tripId: 958, showSpots: 'true' });

    await waitFor(() => expect(screen.getByText('14 spots left')).toBeInTheDocument());
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

describe('gallery scroller', () => {
  it('falls back to the destination banner when no gallery is configured', async () => {
    renderApp({ tripId: 958, showGallery: true });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    const imgs = [...scroller.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(imgs).toEqual(['https://cdn.example.org/guatemala.jpg']);
  });

  it('uses the configured list, comma-separated, over the banner', async () => {
    renderApp({
      tripId: 958,
      showGallery: true,
      galleryUrls: 'https://a.example/1.jpg, https://a.example/2.jpg,https://a.example/3.jpg',
    });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    expect([...scroller.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual([
      'https://a.example/1.jpg',
      'https://a.example/2.jpg',
      'https://a.example/3.jpg',
    ]);
  });

  it('is keyboard reachable — a scroll container needs a tab stop', async () => {
    renderApp({ tripId: 958, showGallery: true });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    expect(scroller).toHaveAttribute('tabindex', '0');
  });

  it('renders nothing when there is no banner and no configured images', async () => {
    hooks.detail = {
      data: { success: true, data: { ...DETAIL, bannerUrl: null } },
      isLoading: false,
      error: null,
    };
    renderApp({ tripId: 958, showGallery: true });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: /Photos from/ })).not.toBeInTheDocument();
  });

  it('spans the page width, escaping the host container', async () => {
    // jsdom reports 0 for every rect, so this asserts the mechanism — that the
    // band is sized off the page rather than left at its container width. The
    // measured widths are checked in the embed lab against a real host.
    renderApp({ tripId: 958, showGallery: true });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    const bleed = scroller.parentElement?.parentElement;
    expect(bleed?.style.width).toMatch(/px$/);
    expect(bleed?.style.marginLeft).toMatch(/px$/);
  });

  it('leaves the bands in their container when fullBleed is off', async () => {
    renderApp({ tripId: 958, showGallery: true, fullBleed: '' });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    expect(scroller.parentElement?.parentElement?.style.width).toBe('');
  });
});

describe('gallery chevron', () => {
  it('is hidden when nothing overflows', async () => {
    // jsdom reports scrollWidth === clientWidth === 0, so nothing overflows and
    // the control must not appear — an arrow that cannot move is worse than no
    // arrow. The overflow case is checked in the embed lab.
    renderApp({ tripId: 958, showGallery: true, galleryUrls: 'https://a.example/1.jpg' });

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /Photos from/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Show more photos' })).not.toBeInTheDocument();
  });

  it('hides the native scrollbar, which is why the chevron exists', async () => {
    renderApp({ tripId: 958, showGallery: true });

    const scroller = await waitFor(() => screen.getByRole('region', { name: /Photos from/ }));
    expect(scroller.className).toContain('[scrollbar-width:none]');
    expect(scroller.className).toContain('[&::-webkit-scrollbar]:hidden');
  });
});

describe('testimonials', () => {
  it('renders the hardcoded quotes with a monogram, not a fake headshot', async () => {
    renderApp({ tripId: 958, showTestimonials: true });

    await waitFor(() => expect(screen.getByText('Hear From Others')).toBeInTheDocument());
    expect(screen.getByText('Olivia Ramirez')).toBeInTheDocument();
    expect(screen.getByText(/gratitude, humility, and joy/)).toBeInTheDocument();
    // Placeholder people must not get invented faces.
    expect(screen.getByText('OR')).toBeInTheDocument();
    const band = screen.getByText('Hear From Others').closest('section, div');
    expect(band?.querySelectorAll('img').length ?? 0).toBe(0);
  });

  // The quotes in src/lib/testimonials.ts are invented placeholder copy, so the
  // band shipping on by accident would put words in strangers' mouths on a
  // church page. Off unless an embed asks for it.
  it('is off by default, because the quotes are placeholder copy', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Hear From Others')).not.toBeInTheDocument();
  });
});

describe('the scroller and testimonial bands are opt-in', () => {
  // Global Outreach has no photos and no real quotes yet, so both bands stay
  // off until an embed turns them on. The rest of the detail view — heading,
  // About the Journey, roster, disclaimer — is unaffected.
  it('renders neither band by default', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Mana De Vida/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: /Photos from/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Hear From Others')).not.toBeInTheDocument();
    // ...and the page it sits in is still whole.
    expect(screen.getByText('About the Journey')).toBeInTheDocument();
    expect(screen.getByText('Meet the Team')).toBeInTheDocument();
  });

  it('shows the scroller once an embed opts in', async () => {
    renderApp({ tripId: 958, showGallery: true });

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /Photos from/ })).toBeInTheDocument(),
    );
  });

  it('shows the testimonial band once an embed opts in', async () => {
    renderApp({ tripId: 958, showTestimonials: true });

    await waitFor(() => expect(screen.getByText('Hear From Others')).toBeInTheDocument());
  });

  it('takes the two independently', async () => {
    renderApp({ tripId: 958, showGallery: true });

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /Photos from/ })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Hear From Others')).not.toBeInTheDocument();
  });
});

describe('Meet the Team stays untouched', () => {
  it('keeps its own heading and its darkened square cards', async () => {
    renderApp({ tripId: 958 });

    await waitFor(() => expect(screen.getByText('Meet the Team')).toBeInTheDocument());
    // Exactly one heading — the section must not add a second above TeamGrid.
    expect(screen.getAllByText('Meet the Team')).toHaveLength(1);
    const card = screen.getByAltText('Lori Allison').closest('div');
    expect(card?.className).toContain('aspect-square');
    expect(card?.querySelector('.bg-black\\/45')).not.toBeNull();
  });
});

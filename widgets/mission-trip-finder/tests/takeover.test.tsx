/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app';
import { MissionTripFinderConfigSchema, type MissionTripFinderConfig } from '../src/types';
import { isSafeSelector } from '../src/hooks/use-page-takeover';

const TRIP = {
  id: 958,
  name: 'Serving students at Mana De Vida',
  destination: 'Guatemala',
  destinationId: 1,
  description: 'Come one, come all!',
  bannerUrl: null,
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
  longDescription: '<p>About.</p>',
  participants: [{ pledgeId: 97540, name: 'Lori Allison' }],
};

vi.mock('@perimeter/api-hooks', () => ({
  useMissionTrips: () => ({
    data: { success: true, data: { trips: [TRIP] } },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useMissionTrip: () => ({ data: { success: true, data: DETAIL }, isLoading: false, error: null }),
  useMissionTripParticipant: () => ({ data: undefined, isLoading: true, error: null }),
}));

function config(overrides: Record<string, unknown> = {}): MissionTripFinderConfig {
  return MissionTripFinderConfigSchema.parse({ detailsMode: 'inline', ...overrides });
}

const HIDE = '.wpb_row:not(#upcoming-journeys)';

/** The injected stylesheet, or null. */
const sheet = () => document.getElementById('perimeter-mission-trip-takeover');

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  sheet()?.remove();
});

// An overlay cannot work from inside the widget: on perimeter.org the embed is
// boxed into a stacking context at z-index 10 by two positioned ancestors, and
// the page's first row sits at z-index 100 in the same context — a fixed child
// of the shadow root at the maximum z-index still lost to it. So the page is
// asked to stand down instead, and these specs pin that contract.
describe('page takeover', () => {
  it('does nothing at all unless the layout asks for it', async () => {
    render(<App config={config({ tripId: 958, detailLayout: 'full', takeoverHide: HIDE })} />);
    await waitFor(() => expect(screen.getByText('About the Journey')).toBeInTheDocument());

    expect(sheet()).toBeNull();
    expect(document.querySelector('[data-screen]')).toBeNull();
  });

  it('hides the host content named by the selector while a trip is open', async () => {
    render(<App config={config({ tripId: 958, detailLayout: 'takeover', takeoverHide: HIDE })} />);
    await waitFor(() => expect(sheet()).not.toBeNull());

    expect(sheet()!.textContent).toBe(`${HIDE}{display:none!important}`);
  });

  it('takes it all back down on the way to the list', async () => {
    render(<App config={config({ detailLayout: 'takeover', takeoverHide: HIDE })} />);
    await userEvent.click(screen.getByRole('button', { name: /Mana De Vida/ }));

    // The takeover is driven by navigation state, so the stylesheet lands before
    // the detail has rendered — wait for the trail, not for the sheet.
    const back = await waitFor(() => screen.getByRole('button', { name: 'GO Journeys' }));
    expect(sheet()).not.toBeNull();

    await userEvent.click(back);

    // The page has to come back, or the reader is left on a page with nothing
    // on it but a widget showing a list.
    await waitFor(() => expect(sheet()).toBeNull());
    expect(document.querySelector('[data-screen]')).toBeNull();
  });

  it('says which level is open, so host CSS can tell them apart', async () => {
    render(<App config={config({ tripId: 958, detailLayout: 'takeover' })} />);

    await waitFor(() =>
      expect(document.querySelector('[data-screen="detail"]')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /View Lori Allison's page/ }));
    await waitFor(() =>
      expect(document.querySelector('[data-screen="participant"]')).toBeInTheDocument(),
    );
    // Retargeted, not torn down and rebuilt — a visit must not restore the
    // page's scroll half-way through.
    expect(document.querySelectorAll('[data-screen]')).toHaveLength(1);
  });

  it('marks the page even with no selector — host CSS alone is enough', async () => {
    render(<App config={config({ tripId: 958, detailLayout: 'takeover' })} />);

    await waitFor(() =>
      expect(document.querySelector('[data-screen="detail"]')).toBeInTheDocument(),
    );
    expect(sheet()).toBeNull();
  });

  it('refuses a selector that could close the rule and inject declarations', async () => {
    render(
      <App
        config={config({
          tripId: 958,
          detailLayout: 'takeover',
          takeoverHide: 'div{display:none} body',
        })}
      />,
    );
    await waitFor(() => expect(screen.getByText('About the Journey')).toBeInTheDocument());

    expect(sheet()).toBeNull();
  });
});

describe('isSafeSelector', () => {
  it('allows the selectors a WordPress page actually needs', () => {
    for (const ok of [
      '.wpb_row:not(#upcoming-journeys)',
      '#a, #b, #c',
      '.container > .row',
      '[data-x="y"]',
      'main *:not(.keep)',
    ]) {
      expect(isSafeSelector(ok), ok).toBe(true);
    }
  });

  it('rejects anything that could carry declarations of its own', () => {
    for (const bad of [
      '',
      'div{color:red}',
      'div}',
      'div;',
      '@import url(x)',
      'div/*x*/',
      '<style>',
      'a'.repeat(501),
    ]) {
      expect(isSafeSelector(bad), bad).toBe(false);
    }
  });
});

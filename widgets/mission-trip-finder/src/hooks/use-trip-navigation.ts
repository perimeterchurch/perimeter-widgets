import { useMemo, useState } from 'react';
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { MissionTripFinderConfig } from '../types';

/**
 * Per-embed URL-key prefix. nuqs v2's adapter exposes no global prefix option,
 * so each key is namespaced to its own URL parameter via `useQueryStates`'
 * `urlKeys`. Two mission-trip embeds on one page therefore never collide.
 */
const PREFIX = 'trip-';

export type ScreenMode = 'browse' | 'detail';

export interface TripNavigation {
  screen: ScreenMode;
  /** The trip being viewed, or null on the browse screen. */
  id: number | null;
  /** The participant being viewed on that trip, or null for the trip itself. */
  pledgeId: number | null;
  /** True when the embed is pinned to one trip and there is no list to go back to. */
  isPinned: boolean;
  openTrip: (id: number) => void;
  openParticipant: (pledgeId: number) => void;
  /** Leave the participant view for the trip it belongs to. */
  closeParticipant: () => void;
  back: () => void;
}

/**
 * Which screen the widget is on, held in the URL so a trip is a shareable deep
 * link and the browser back button steps out of the detail.
 *
 * Far smaller than the sermons widget's `use-sermon-filters` — mission trips
 * have no tabs, facets, or sort, so the whole navigation surface is a screen
 * and an ID.
 *
 * `config.tripId` pins the widget to a single trip. That is the mode a
 * dedicated details page embeds: the detail renders immediately, the URL is
 * never written to, and there is no Back button because there is no list
 * behind it.
 */
export function useTripNavigation(config: MissionTripFinderConfig): TripNavigation {
  const params = useMemo(
    () => ({
      screen: parseAsStringLiteral(['browse', 'detail'] as const).withDefault('browse'),
      id: parseAsInteger,
      pledge: parseAsInteger,
    }),
    [],
  );

  const urlKeys = useMemo(
    () =>
      Object.fromEntries(Object.keys(params).map((key) => [key, `${PREFIX}${key}`])) as Record<
        keyof typeof params,
        string
      >,
    [params],
  );

  const [state, setState] = useQueryStates(params, { history: 'push', urlKeys });

  // Only used by the pinned branch below, but hooks cannot be called
  // conditionally — a pinned embed must not write to a URL it does not own.
  //
  // `config.pledgeId` SEEDS this rather than being merged with it on every
  // render. Falling back to the config value each time would pin the
  // participant permanently: "View Trip Details" clears the state, the config
  // immediately supplies it again, and the button does nothing.
  const [pinnedPledge, setPinnedPledge] = useState<number | null>(config.pledgeId ?? null);

  if (config.tripId) {
    // Pinned: the host page owns the URL, so participant selection is local
    // state rather than a query param. `data-pledge-id` is how such a page
    // opens straight to a participant — it reads `?pledge=` itself and passes
    // it in, exactly as it does with `?id=` and `data-trip-id`.
    return {
      screen: 'detail',
      id: config.tripId,
      pledgeId: pinnedPledge,
      isPinned: true,
      openTrip: () => {},
      openParticipant: setPinnedPledge,
      closeParticipant: () => setPinnedPledge(null),
      back: () => {},
    };
  }

  return {
    screen: state.screen === 'detail' && state.id ? 'detail' : 'browse',
    id: state.id,
    pledgeId: state.screen === 'detail' && state.id ? state.pledge : null,
    isPinned: false,
    openTrip: (id: number) => {
      void setState({ screen: 'detail', id, pledge: null });
    },
    openParticipant: (pledgeId: number) => {
      void setState({ pledge: pledgeId });
    },
    closeParticipant: () => {
      void setState({ pledge: null });
    },
    back: () => {
      void setState({ screen: 'browse', id: null, pledge: null });
    },
  };
}

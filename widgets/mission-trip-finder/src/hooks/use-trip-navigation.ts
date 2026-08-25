import { useMemo } from 'react';
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
  /** True when the embed is pinned to one trip and there is no list to go back to. */
  isPinned: boolean;
  openTrip: (id: number) => void;
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

  if (config.tripId) {
    return {
      screen: 'detail',
      id: config.tripId,
      isPinned: true,
      openTrip: () => {},
      back: () => {},
    };
  }

  return {
    screen: state.screen === 'detail' && state.id ? 'detail' : 'browse',
    id: state.id,
    isPinned: false,
    openTrip: (id: number) => {
      void setState({ screen: 'detail', id });
    },
    back: () => {
      void setState({ screen: 'browse', id: null });
    },
  };
}

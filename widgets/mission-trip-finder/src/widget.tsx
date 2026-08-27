import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { MissionTripFinderConfigSchema } from './types';

export default defineWidget({
  name: 'mission-trip-finder',
  auth: 'none',
  // Perimeter's design language has no corner radius — the cards, hero and
  // team photos here are already square. Zeroing the three radius tokens
  // flattens every `@perimeter/ui` component the widget renders (Button,
  // Skeleton, the empty/message boxes) from one place, rather than sprinkling
  // `rounded-none` down the tree. Badges are deliberately untouched: they use
  // `rounded-4xl`, not a radius token, so a status pill still reads as a pill.
  // A host page's `data-theme-radius-*` still wins, so an embed can put a
  // radius back.
  //
  // White button labels are Global Outreach's explicit call, made knowing the
  // tradeoff: `primary` is a LIGHT sky-blue, so white on it is ~2:1 and fails
  // WCAG AA, where the default navy `primary-fg` is 7.3:1. Overriding the token
  // here rather than the palette keeps that decision inside this widget — every
  // other widget keeps the AA-compliant pairing that
  // packages/theme/tests/contrast.test.ts guards. Only Button reads
  // `primary-fg` in this tree; the status pills are `warning`/`secondary`, so
  // they are unaffected.
  //
  // The metadata grey (destination, dates, trip facts, the disclaimer) is
  // Global Outreach's: the same lightness as the shared `muted-fg` but
  // desaturated from 16% to a near-neutral 0.5%, so the secondary text reads
  // grey rather than blue-grey next to the navy headings. It stays above WCAG
  // AA on both surfaces this widget renders it on — 5.08:1 on white and 4.63:1
  // in the `bg-muted` message box, against the 4.5:1 floor.
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
    'color-primary-fg': 'hsl(0 0% 100%)',
    'color-muted-fg': 'hsl(215 0.5% 43.28%)',
  },
  schema: MissionTripFinderConfigSchema,
  App: ({ config }) => <App config={config} />,
});

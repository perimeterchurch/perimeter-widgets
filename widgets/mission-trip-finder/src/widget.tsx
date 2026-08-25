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
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
  },
  schema: MissionTripFinderConfigSchema,
  App: ({ config }) => <App config={config} />,
});

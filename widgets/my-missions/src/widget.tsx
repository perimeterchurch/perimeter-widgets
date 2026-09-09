import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'my-missions',
  // `GET /api/missions/my-trips` scopes everything to the caller's own donor
  // and household, so there is nothing to render without a session. The
  // runtime's AuthGate shows a sign-in prompt until an MP session exists.
  auth: 'required',
  // Perimeter's UI standard is square corners: 0px radius, everywhere. The
  // shared theme still ships 4/8/12px (`packages/theme/src/tokens.ts`), which
  // the other twelve widgets are built against, so this is a per-widget token
  // override rather than a change to the design system. Overriding the tokens
  // rather than stripping `rounded-*` classes flattens the shared
  // @perimeter/ui components this widget renders (Button, Skeleton, Empty)
  // too — a class-level sweep could not reach inside those.
  //
  // The token scale (sm/md/lg) is the ONLY radius source this widget may use.
  // The pill, xl and 4xl steps compile to values Tailwind hardcodes into the
  // CSS, which no token override can reach — tests/radius.test.ts fails the
  // build if one reappears. It cannot spell them here: Tailwind's scanner reads
  // comments as candidate classes, so naming one compiles a real rule into the
  // shipped CSS.
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
  },
  // Host-page config arrives as data-* attributes (always strings). Use
  // z.coerce.number()/z.coerce.boolean() for any numeric/boolean fields so the
  // studio and production parse them identically.
  schema: z.object({
    title: z.string().default('My Missions').describe('Heading shown above the trip list.'),
    currentTitle: z
      .string()
      .default('Current Trips')
      .describe('Heading for trips that have not ended yet.'),
    pastTitle: z
      .string()
      .default('Past Trips')
      .describe('Heading for trips that have already ended.'),
    showPastTrips: z.coerce
      .boolean()
      .default(true)
      .describe('Show the past-trips section (the last five years of trips).'),
    // The mount reads `apiUrl` off the parsed config to pick the API client's
    // base URL; it is read here too so leader photo `<img>` tags resolve
    // against the API origin rather than the host page's.
    apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
  }),
  configLabels: {
    currentTitle: 'Current trips heading',
    pastTitle: 'Past trips heading',
    showPastTrips: 'Show past trips',
    apiUrl: 'API address (advanced)',
  },
  App: ({ config }) => <App config={config} />,
});

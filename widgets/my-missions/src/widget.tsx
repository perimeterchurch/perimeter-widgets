import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'my-missions',
  // `GET /api/missions/my-trips` scopes everything to the caller's own donor
  // and household, so there is nothing to render without a session. The
  // runtime's AuthGate shows a sign-in prompt until an MP session exists.
  auth: 'required',
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

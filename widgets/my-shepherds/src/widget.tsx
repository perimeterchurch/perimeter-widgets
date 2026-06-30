import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'my-shepherds',
  // The endpoint is user-authenticated; the runtime's AuthGate renders a
  // sign-in prompt until an MP session exists, so the App only renders for
  // authenticated visitors.
  auth: 'required',
  // Host-page config arrives as data-* attributes (always strings). Use
  // z.coerce.number()/z.coerce.boolean() for any numeric/boolean fields so the
  // studio and production parse them identically.
  schema: z.object({
    title: z.string().default('My Shepherds').describe('Heading shown above the shepherd cards.'),
    apiUrl: z.string().optional().describe('Override the perimeter-api base URL (advanced).'),
  }),
  App: ({ config }) => <App config={config} />,
});

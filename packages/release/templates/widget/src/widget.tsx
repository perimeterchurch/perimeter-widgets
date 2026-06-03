import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: '__NAME__',
  auth: 'none',
  // Host-page config arrives as data-* attributes (always strings). Use
  // z.coerce.number()/z.coerce.boolean() for any numeric/boolean fields so the
  // studio and production parse them identically.
  schema: z.object({
    title: z.string().default('__NAME__'),
  }),
  App: ({ config }) => <App config={config} />,
});

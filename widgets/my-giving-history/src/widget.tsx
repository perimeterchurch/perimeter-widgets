import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'my-giving-history',
  // The host page already holds the user's Ministry Platform session (token in
  // localStorage); 'required' makes the runtime show a sign-in prompt until that
  // token is present, then the api-client forwards it as a bearer token.
  auth: 'required',
  // Host-page config arrives as data-* attributes (always strings). Use
  // z.coerce.number()/z.coerce.boolean() for any numeric/boolean fields so the
  // studio and production parse them identically.
  schema: z.object({
    title: z.string().default('My Giving History'),
  }),
  App: ({ config }) => <App config={config} />,
});

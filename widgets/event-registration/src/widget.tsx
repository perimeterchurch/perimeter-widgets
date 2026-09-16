import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { EventRegistrationConfigSchema } from './types';

export default defineWidget({
  name: 'event-registration',
  // Optional, not required: the event details are public, a signed-in member
  // registers their household from a roster, and — when neither the event nor
  // its forms force login — a visitor may register themself through the
  // blank form. The host page keeps MP's own <mpp-user-login> for signing in.
  auth: 'optional',
  // Perimeter's design language has no corner radius (see prayer-wall).
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
  },
  schema: EventRegistrationConfigSchema,
  App: ({ config, auth }) => <App config={config} auth={auth} />,
});

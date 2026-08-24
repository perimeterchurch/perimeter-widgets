import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { PrayerWallConfigSchema } from './types';

export default defineWidget({
  name: 'prayer-wall',
  // Optional, not required: the feed is public and anyone may press "I Prayed",
  // while the form uses an MP session when there is one (a read-only "Me"
  // field) and asks a visitor for their name and email when there isn't.
  auth: 'optional',
  // Host-page config arrives as data-* attributes (always strings):
  //   data-show-form, data-show-feed, data-days, data-per-page,
  //   data-form-title, data-feed-title, data-recaptcha-site-key, data-api-url.
  schema: PrayerWallConfigSchema,
  App: ({ config, auth }) => <App config={config} auth={auth} />,
});

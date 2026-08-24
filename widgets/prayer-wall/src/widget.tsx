import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { PrayerWallConfigSchema } from './types';

export default defineWidget({
  name: 'prayer-wall',
  // Optional, not required: the feed is public and anyone may press "I Prayed",
  // while the form uses an MP session when there is one (a read-only "Me"
  // field) and asks a visitor for their name and email when there isn't.
  auth: 'optional',
  // Perimeter's design language has no corner radius — buttons, inputs and
  // cards are rectangles. Zeroing the three radius tokens flattens every
  // `@perimeter/ui` component the wall renders (Button, Input, Textarea,
  // Skeleton, the pager) from one place, rather than sprinkling
  // `rounded-none` down the tree. A host page's `data-theme-radius-*` still
  // wins over this, so an embed can put a radius back if it ever needs one.
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
  },
  // Host-page config arrives as data-* attributes (always strings):
  //   data-show-form, data-show-feed, data-days, data-per-page,
  //   data-form-title, data-feed-title, data-recaptcha-site-key, data-api-url.
  schema: PrayerWallConfigSchema,
  App: ({ config, auth }) => <App config={config} auth={auth} />,
});

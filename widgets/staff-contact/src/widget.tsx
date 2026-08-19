import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { StaffContactConfigSchema } from './types';

export default defineWidget({
  name: 'staff-contact',
  auth: 'none',
  // Host-page config arrives as data-* attributes (always strings):
  //   data-contact-guid, data-recaptcha-site-key (optional), data-api-url (optional).
  schema: StaffContactConfigSchema,
  App: ({ config }) => <App config={config} />,
});

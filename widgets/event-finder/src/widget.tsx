import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { EventFinderConfigSchema } from './types';

export default defineWidget({
  name: 'event-finder',
  auth: 'none',
  schema: EventFinderConfigSchema,
  App: ({ config }) => <App config={config} />,
});

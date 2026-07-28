import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { MissionTripFinderConfigSchema } from './types';

export default defineWidget({
  name: 'mission-trip-finder',
  auth: 'none',
  schema: MissionTripFinderConfigSchema,
  App: ({ config }) => <App config={config} />,
});

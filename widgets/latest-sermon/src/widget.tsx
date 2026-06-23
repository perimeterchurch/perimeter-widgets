import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { LatestSermonConfigSchema } from './types';

export default defineWidget({
  name: 'latest-sermon',
  auth: 'none',
  schema: LatestSermonConfigSchema,
  App: ({ config }) => <App config={config} />,
});

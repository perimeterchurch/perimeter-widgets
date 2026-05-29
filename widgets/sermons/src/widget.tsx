import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './App';
import { SermonsConfigSchema } from './types';

export default defineWidget({
  name: 'sermons',
  auth: 'none',
  schema: SermonsConfigSchema,
  App: ({ config }) => <App config={config} />,
});

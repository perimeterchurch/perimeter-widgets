import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { CommunityGroupFinderConfigSchema } from './types';

export default defineWidget({
  name: 'community-group-finder',
  auth: 'none',
  schema: CommunityGroupFinderConfigSchema,
  App: ({ config }) => <App config={config} />,
});

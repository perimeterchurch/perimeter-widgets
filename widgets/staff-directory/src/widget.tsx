import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { StaffDirectoryConfigSchema } from './types';

export default defineWidget({
  name: 'staff-directory',
  auth: 'none',
  schema: StaffDirectoryConfigSchema,
  App: ({ config }) => <App config={config} />,
});

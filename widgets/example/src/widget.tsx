import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'example',
  auth: 'none',
  schema: z.object({
    greeting: z.string().default('Hello'),
    count: z.coerce.number().int().min(0).max(20).default(3),
  }),
  App: ({ config }) => <App config={config} />,
});

import { defineWidget } from '@perimeter/widget-runtime';
import { App } from './app';
import { FrontierPledgeConfigSchema } from './types';

export default defineWidget({
  name: 'frontier-pledge',
  auth: 'none',
  // Host-page config arrives as data-* attributes (always strings):
  //   data-heading, data-period, data-amount-label, data-account-url,
  //   data-api-url. See src/types.ts for the schema and defaults.
  schema: FrontierPledgeConfigSchema,
  // Perimeter's design language has no corner radius, and the campaign design
  // this widget reproduces is square-cornered throughout. Zeroing the three
  // radius tokens flattens every `@perimeter/ui` component in the tree (Input,
  // InputGroup, Button) from one place instead of sprinkling `rounded-none`
  // down it. A host page's `data-theme-radius-*` still wins.
  //
  // `destructive` is re-pointed because EVERY surface in this widget is the
  // navy band, and the shared destructive red (#ef4444) is only 3.9:1 on it —
  // below WCAG AA for the small validation text it is used for. The lighter
  // red is 7.6:1 on navy. Scoped here rather than in the palette: every other
  // widget renders errors on white, where the shared red is correct and
  // packages/theme/tests/contrast.test.ts guards it.
  themeOverrides: {
    'radius-sm': '0px',
    'radius-md': '0px',
    'radius-lg': '0px',
    'color-destructive': 'hsl(0 93.5% 81.8%)',
  },
  // Readable names for the studio's Configure panel. Presentational only — the
  // `data-*` attribute an embed writes still comes from the schema key.
  configLabels: {
    heading: 'Headline',
    period: 'Pledge period',
    amountLabel: 'Amount field label',
    accountUrl: 'Link to check a pledge',
    apiUrl: 'API base URL (advanced)',
  },
  App: ({ config }) => <App config={config} />,
});

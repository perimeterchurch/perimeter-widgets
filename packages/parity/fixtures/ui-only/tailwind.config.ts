import type { Config } from 'tailwindcss';
import preset from '@perimeter/theme/tailwind';

/**
 * Scans @perimeter/ui source ALONE — used by the parity tooling to attribute
 * selectors to ui components (H2). Loaded by styles.css via `@config`; content
 * globs resolve relative to this file.
 */
const config: Config = {
  presets: [preset],
  content: ['../../../ui/src/**/*.{ts,tsx}'],
};
export default config;

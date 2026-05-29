import type { Config } from 'tailwindcss';
import preset from '@perimeter/theme/tailwind';
const config: Config = { presets: [preset], content: ['./src/**/*.{ts,tsx}'] };
export default config;

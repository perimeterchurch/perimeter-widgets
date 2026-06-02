import type { Config } from 'tailwindcss';
import preset, { widgetContent } from '@perimeter/theme/tailwind';
const config: Config = { presets: [preset], content: widgetContent };
export default config;

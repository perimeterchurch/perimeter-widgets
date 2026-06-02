import type { Config } from 'tailwindcss';
import preset from '@perimeter/theme/tailwind';

export default {
  // The studio processes its OWN styles.css (component previews, light DOM) AND each
  // widget's `styles.css?inline` (shadow-root injection) with THIS config, so Tailwind
  // must scan the widget + ui source — otherwise none of those classes are generated and
  // everything renders unstyled. The theme preset maps semantic classes (bg-primary, …)
  // to the CSS variables mount()/ComponentPreview provide.
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../widgets/*/src/**/*.{ts,tsx}',
    '../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;

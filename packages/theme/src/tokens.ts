export const globalTokens = {
  'color-bg': 'hsl(0 0% 100%)',
  // Text/headings = Perimeter brand navy #09243f (hsl(210 75% 14.1%) round-trips
  // exactly); 15.7:1 on white. Sourced from perimeter.org (--nectar-extra-color-1).
  'color-fg': 'hsl(210 75% 14.1%)',
  'color-muted': 'hsl(210 40% 96%)',
  // 44% (was 47%): the lightest this can be and keep WCAG AA 4.5:1 for small
  // text on the muted surfaces it actually renders on (bg-muted, bg-muted/60
  // chips) — guarded by tests/contrast.test.ts.
  'color-muted-fg': 'hsl(215 16% 44%)',
  // Brand accent = #60bbe9 (hsl(200.1 75.7% 64.5%) round-trips to it exactly).
  // It's a LIGHT sky-blue, so primary-fg is dark navy (8.3:1 on primary — the
  // contrast.test.ts primary-fg/primary AA guard); near-white text would be ~2:1.
  'color-primary': 'hsl(200.1 75.7% 64.5%)',
  // Dark text on the light accent = brand navy #09243f (7.3:1 on primary).
  'color-primary-fg': 'hsl(210 75% 14.1%)',
  // Secondary button/badge = solid brand navy with white text (15.7:1).
  'color-secondary': 'hsl(210 75% 14.1%)',
  'color-secondary-fg': 'hsl(0 0% 100%)',
  // Accent is the menu/dropdown hover SURFACE — a soft tint of the brand blue
  // (was purple) with brand-navy text on it.
  'color-accent': 'hsl(200 76% 90%)',
  'color-accent-fg': 'hsl(210 75% 14.1%)',
  'color-destructive': 'hsl(0 84% 60%)',
  'color-destructive-fg': 'hsl(210 40% 98%)',
  'color-border': 'hsl(214 32% 91%)',
  // Focus outline = the brand accent #60bbe9.
  'color-ring': 'hsl(200.1 75.7% 64.5%)',
  // Brand navy dark surface for deliberate dark bands/headers/CTA blocks
  // (bg-surface-dark + text-surface-dark-fg); white text on it (15.7:1).
  'color-surface-dark': 'hsl(210 75% 14.1%)',
  'color-surface-dark-fg': 'hsl(0 0% 100%)',
  'radius-sm': '4px',
  'radius-md': '8px',
  'radius-lg': '12px',
  // Brand sans = Sweet Sans Pro (Adobe Fonts, perimeter.org's body/UI face). Named
  // FIRST so an embed on a page that already loads it (notably perimeter.org's own
  // Typekit — font availability is document-scoped, not shadow-encapsulated) renders
  // in the real brand font for free; Inter + system are the free fallbacks elsewhere.
  'font-sans': '"sweet-sans-pro", Inter, system-ui, -apple-system, sans-serif',
  // Brand display serif = Freight Display Pro (Adobe Fonts; perimeter.org H1/H2).
  // Free fallbacks: Playfair Display, then the system serif. Use via `font-serif`.
  'font-serif': '"freight-display-pro", "Playfair Display", Georgia, "Times New Roman", serif',
  'font-mono': 'ui-monospace, SFMono-Regular, monospace',
  // Elevation scale — Tailwind v4's default shadow values, tokenized so an
  // embed can flatten or elevate the whole widget (data-theme-shadow-md, …).
  'shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  // Type scale — px (not rem) so host font-size cannot rescale widgets, same
  // rule as radii. text-base also drives the :host surface font-size, so a
  // data-theme-text-base override scales a widget's unstyled text with it.
  // 2xs is the micro-label size (uppercase eyebrows, thumbnail page numbers).
  'text-2xs': '10px',
  'text-xs': '12px',
  'text-sm': '14px',
  'text-base': '16px',
  'text-lg': '18px',
  'text-xl': '20px',
} as const;

export type ThemeToken = keyof typeof globalTokens;

/**
 * Dark palette over the SAME keys as {@link globalTokens}. Colors are
 * dark-surface values with readable contrast; radii, fonts, and the type scale
 * are identical to light, while shadows keep the light geometry at higher
 * opacity (low-contrast shadows read as flat on dark surfaces). `resolveTokens`
 * emits these under `:host([data-theme="dark"])`, so dark mode is a pure
 * CSS-variable swap activated by `data-theme="dark"` on the host.
 */
export const darkTokens: Record<ThemeToken, string> = {
  'color-bg': 'hsl(222 47% 11%)',
  'color-fg': 'hsl(210 40% 98%)',
  'color-muted': 'hsl(217 33% 17%)',
  'color-muted-fg': 'hsl(215 20% 65%)',
  // Brand accent #60bbe9 in dark mode too (brand-navy #09243f text on it: 7.3:1).
  'color-primary': 'hsl(200.1 75.7% 64.5%)',
  'color-primary-fg': 'hsl(210 75% 14.1%)',
  'color-secondary': 'hsl(217 33% 17%)',
  'color-secondary-fg': 'hsl(210 40% 98%)',
  // Hover surface: a soft DARK blue tint (light text on it: 9.6:1).
  'color-accent': 'hsl(200 45% 24%)',
  'color-accent-fg': 'hsl(210 40% 98%)',
  'color-destructive': 'hsl(0 63% 51%)',
  'color-destructive-fg': 'hsl(210 40% 98%)',
  'color-border': 'hsl(217 33% 20%)',
  'color-ring': 'hsl(200.1 75.7% 64.5%)',
  // Brand navy band — same color in both themes (secondary stays a lighter
  // slate in dark mode so navy-on-navy buttons don't vanish).
  'color-surface-dark': 'hsl(210 75% 14.1%)',
  'color-surface-dark-fg': 'hsl(0 0% 100%)',
  'radius-sm': globalTokens['radius-sm'],
  'radius-md': globalTokens['radius-md'],
  'radius-lg': globalTokens['radius-lg'],
  'font-sans': globalTokens['font-sans'],
  'font-serif': globalTokens['font-serif'],
  'font-mono': globalTokens['font-mono'],
  'shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.25)',
  'shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.35)',
  'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.35), 0 2px 4px -2px rgb(0 0 0 / 0.35)',
  'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.35)',
  'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.35)',
  'text-2xs': globalTokens['text-2xs'],
  'text-xs': globalTokens['text-xs'],
  'text-sm': globalTokens['text-sm'],
  'text-base': globalTokens['text-base'],
  'text-lg': globalTokens['text-lg'],
  'text-xl': globalTokens['text-xl'],
};

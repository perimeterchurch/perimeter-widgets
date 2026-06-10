export const globalTokens = {
  'color-bg': 'hsl(0 0% 100%)',
  'color-fg': 'hsl(222 47% 11%)',
  'color-muted': 'hsl(210 40% 96%)',
  // 44% (was 47%): the lightest this can be and keep WCAG AA 4.5:1 for small
  // text on the muted surfaces it actually renders on (bg-muted, bg-muted/60
  // chips) — guarded by tests/contrast.test.ts.
  'color-muted-fg': 'hsl(215 16% 44%)',
  'color-primary': 'hsl(221 83% 53%)',
  'color-primary-fg': 'hsl(210 40% 98%)',
  'color-secondary': 'hsl(210 40% 96%)',
  'color-secondary-fg': 'hsl(222 47% 11%)',
  'color-accent': 'hsl(262 83% 58%)',
  'color-accent-fg': 'hsl(210 40% 98%)',
  'color-destructive': 'hsl(0 84% 60%)',
  'color-destructive-fg': 'hsl(210 40% 98%)',
  'color-border': 'hsl(214 32% 91%)',
  'color-ring': 'hsl(221 83% 53%)',
  'radius-sm': '4px',
  'radius-md': '8px',
  'radius-lg': '12px',
  'font-sans': 'Inter, system-ui, -apple-system, sans-serif',
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
  'color-primary': 'hsl(217 91% 60%)',
  'color-primary-fg': 'hsl(222 47% 11%)',
  'color-secondary': 'hsl(217 33% 17%)',
  'color-secondary-fg': 'hsl(210 40% 98%)',
  'color-accent': 'hsl(263 70% 65%)',
  'color-accent-fg': 'hsl(222 47% 11%)',
  'color-destructive': 'hsl(0 63% 51%)',
  'color-destructive-fg': 'hsl(210 40% 98%)',
  'color-border': 'hsl(217 33% 20%)',
  'color-ring': 'hsl(217 91% 60%)',
  'radius-sm': globalTokens['radius-sm'],
  'radius-md': globalTokens['radius-md'],
  'radius-lg': globalTokens['radius-lg'],
  'font-sans': globalTokens['font-sans'],
  'font-mono': globalTokens['font-mono'],
  'shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.25)',
  'shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.35)',
  'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.35), 0 2px 4px -2px rgb(0 0 0 / 0.35)',
  'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.35)',
  'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.35)',
  'text-xs': globalTokens['text-xs'],
  'text-sm': globalTokens['text-sm'],
  'text-base': globalTokens['text-base'],
  'text-lg': globalTokens['text-lg'],
  'text-xl': globalTokens['text-xl'],
};

export const globalTokens = {
  'color-bg': 'hsl(0 0% 100%)',
  'color-fg': 'hsl(222 47% 11%)',
  'color-muted': 'hsl(210 40% 96%)',
  'color-muted-fg': 'hsl(215 16% 47%)',
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
} as const;

export type ThemeToken = keyof typeof globalTokens;

/**
 * Dark palette over the SAME keys as {@link globalTokens}. Colors are
 * dark-surface values with readable contrast; radii and fonts are identical to
 * light. `resolveTokens` emits these under `:host([data-theme="dark"])`, so dark
 * mode is a pure CSS-variable swap activated by `data-theme="dark"` on the host.
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
};

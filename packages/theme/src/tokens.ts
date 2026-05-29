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
  'radius-sm': '0.25rem',
  'radius-md': '0.5rem',
  'radius-lg': '0.75rem',
  'font-sans': 'Inter, system-ui, -apple-system, sans-serif',
  'font-mono': 'ui-monospace, SFMono-Regular, monospace',
} as const;

export type ThemeToken = keyof typeof globalTokens;

import { useCallback, useEffect, useState } from 'react';

export type StudioTheme = 'light' | 'dark';

const STORAGE_KEY = 'studio-theme';
const DEFAULT_THEME: StudioTheme = 'dark';

/**
 * Read the persisted chrome theme, defaulting to dark. SSR-safe (the studio is
 * client-only, but the typeof-window guard keeps this importable at module load
 * for {@link applyInitialStudioTheme}, which main.tsx calls before render).
 */
export function readStoredStudioTheme(): StudioTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
}

/**
 * Apply the initial chrome theme to `document.documentElement` BEFORE React
 * renders, so the studio paints dark on first frame with no light flash. Called
 * once from main.tsx.
 */
export function applyInitialStudioTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', readStoredStudioTheme());
}

/**
 * The studio CHROME light/dark theme. Defaults to dark, persists to localStorage
 * under `studio-theme`, and applies `data-theme` to `document.documentElement` so
 * the `:root[data-theme="dark"]` token layer swaps. This is independent of the
 * widget-preview canvas toggle, which sets `data-theme` on the shadow host.
 */
export function useStudioTheme(): {
  theme: StudioTheme;
  setTheme: (next: StudioTheme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<StudioTheme>(readStoredStudioTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: StudioTheme) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { theme, setTheme, toggle };
}

'use client';
import * as React from 'react';
import type { ThemeToken } from '@perimeter/theme';

type Overrides = Partial<Record<ThemeToken, string>>;
interface Ctx {
  overrides: Overrides;
  setOverride: (token: ThemeToken, value: string) => void;
  resetOverride: (token: ThemeToken) => void;
}
const ThemeOverridesContext = React.createContext<Ctx | null>(null);
const STYLE_ID = 'perimeter-theme-overrides';

function writeStyleTag(overrides: Overrides): void {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const decls = Object.entries(overrides)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  el.textContent = decls ? `:root {\n${decls}\n}` : '';
}

export function ThemeOverridesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [overrides, setOverrides] = React.useState<Overrides>({});
  React.useEffect(() => {
    writeStyleTag(overrides);
  }, [overrides]);
  const value: Ctx = {
    overrides,
    setOverride(token, val) {
      setOverrides((o) => ({ ...o, [token]: val }));
    },
    resetOverride(token) {
      setOverrides((o) => {
        const { [token]: _, ...rest } = o;
        void _;
        return rest;
      });
    },
  };
  return <ThemeOverridesContext.Provider value={value}>{children}</ThemeOverridesContext.Provider>;
}

export function useThemeOverrides(): Ctx {
  const ctx = React.useContext(ThemeOverridesContext);
  if (!ctx) throw new Error('useThemeOverrides() must be used inside ThemeOverridesProvider');
  return ctx;
}

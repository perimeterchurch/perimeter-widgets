import * as React from 'react';

export interface ThemeProviderProps {
  cssText: string; // resolved by resolveTokens()
  children: React.ReactNode;
}

export function ThemeProvider({ cssText, children }: ThemeProviderProps): React.JSX.Element {
  return (
    <>
      <style data-perimeter-theme>{cssText}</style>
      {children}
    </>
  );
}

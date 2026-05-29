import * as React from 'react';
import '../styles/globals.css';
import { ThemeOverridesProvider } from '../lib/theme-overrides-context';

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <ThemeOverridesProvider>{children}</ThemeOverridesProvider>
      </body>
    </html>
  );
}

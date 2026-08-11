import type { ReactNode } from 'react';

// Minimal root layout. The visible UI is the Vite studio served from /public
// via the SPA-fallback rewrite in next.config.ts. This shell exists for the
// auth gate — middleware + /api/auth (Tasks 1.2/1.3) and the /signin +
// /unauthorized pages (Task 1.4) are added on top of this.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

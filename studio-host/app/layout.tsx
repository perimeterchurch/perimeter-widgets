import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

import './auth.css';

/**
 * Minimal root layout. The visible UI is the Vite studio served from /public via
 * the SPA-fallback rewrite in next.config.ts; this shell exists for the auth gate
 * and its two pages (/sign-in, /access-denied).
 *
 * Inter — not helpdesk's Geist — because Inter is what the studio itself loads
 * (studio/index.html), and the sign-in page should match the app it gates. The
 * card, palette, copy, and click-to-sign-in behaviour are helpdesk's; the face is
 * the studio's.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-studio-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Perimeter Studio',
  description: 'Design system and widget catalogue for Perimeter Church',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

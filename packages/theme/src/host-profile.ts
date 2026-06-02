/**
 * Measured production host-page environment (perimeter.org WordPress page).
 * Source of truth shared by the studio's HostFrame and the parity audit
 * fixture (packages/parity/fixtures/wordpress.html) — a parity test asserts
 * the fixture matches these values, so they cannot drift apart.
 * Measured 2026-06-02 via headless Chromium getComputedStyle.
 */
export const hostProfile = {
  rootFontSize: '16px',
  bodyFontFamily: 'sweet-sans-pro, "Helvetica Neue", Arial, sans-serif',
  bodyFontSize: '19px',
  bodyLineHeight: '35px',
  bodyColor: '#353535',
  bodyBackground: '#ffffff',
  contentMaxWidth: '1425px',
  contentPaddingX: '90px',
} as const;

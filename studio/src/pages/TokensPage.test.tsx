// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { globalTokens } from '@perimeter/theme';
import { TokensPage } from './TokensPage';

// Render-path guard for the /tokens reference. typecheck/build pass even when the
// page crashes at runtime, so exercise the actual render and assert it surfaces
// every token from globalTokens (no hard-coded counts — the page is data-driven).
// This suite has no global RTL auto-cleanup; unmount each render so the page's
// DOM does not leak into later assertions in the shared document.

const colorTokens = (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
  k.startsWith('color-'),
);
const radiusTokens = (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
  k.startsWith('radius-'),
);
const fontTokens = (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
  k.startsWith('font-'),
);

describe('TokensPage (/tokens)', () => {
  afterEach(cleanup);

  it('renders a color swatch for every color token with its var name and literal value', () => {
    const { container } = render(<TokensPage />);
    const scope = within(container);

    for (const token of colorTokens) {
      // The css var name (e.g. --color-primary) is unique per token.
      expect(scope.getByText(`--${token}`)).toBeTruthy();

      // The swatch chip is painted with the live var so chrome + page stay in sync.
      const swatch = container.querySelector(`[data-token-swatch="${token}"]`);
      expect(swatch).toBeTruthy();
      expect((swatch as HTMLElement).style.background).toBe(`var(--${token})`);

      // The literal value is shown in the same row. (Several tokens share a value,
      // e.g. color-fg and color-secondary-fg, so scope the lookup to this row.)
      const row = swatch!.closest('li')!;
      expect(within(row).getByText(globalTokens[token])).toBeTruthy();
    }
  });

  it('renders a radius sample driven by border-radius for every radius token', () => {
    const { container } = render(<TokensPage />);
    const scope = within(container);

    for (const token of radiusTokens) {
      expect(scope.getByText(`--${token}`)).toBeTruthy();
      expect(scope.getByText(globalTokens[token])).toBeTruthy();

      const sample = container.querySelector(`[data-token-radius="${token}"]`);
      expect(sample).toBeTruthy();
      expect((sample as HTMLElement).style.borderRadius).toBe(`var(--${token})`);
    }
  });

  it('renders each font stack in its own font-family', () => {
    const { container } = render(<TokensPage />);
    const scope = within(container);

    for (const token of fontTokens) {
      expect(scope.getByText(`--${token}`)).toBeTruthy();

      const sample = container.querySelector(`[data-token-font="${token}"]`);
      expect(sample).toBeTruthy();
      expect((sample as HTMLElement).style.fontFamily).toBe(`var(--${token})`);
    }
  });
});

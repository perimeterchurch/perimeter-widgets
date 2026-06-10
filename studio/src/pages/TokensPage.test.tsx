// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, within, fireEvent } from '@testing-library/react';
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

      const sample = container.querySelector(`[data-token-radius="${token}"]`);
      expect(sample).toBeTruthy();
      expect((sample as HTMLElement).style.borderRadius).toBe(`var(--${token})`);
      // Value text scoped to this row — px values repeat across groups now
      // (radius-lg and text-xs are both 12px).
      const row = sample!.closest('li')!;
      expect(within(row).getByText(globalTokens[token])).toBeTruthy();
    }
  });

  it('renders type-scale and shadow samples driven by their tokens', () => {
    const { container } = render(<TokensPage />);
    const scope = within(container);

    for (const token of (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
      k.startsWith('text-'),
    )) {
      expect(scope.getByText(`--${token}`)).toBeTruthy();
      const sample = container.querySelector(`[data-token-text="${token}"]`);
      expect(sample).toBeTruthy();
      expect((sample as HTMLElement).style.fontSize).toBe(`var(--${token})`);
    }

    for (const token of (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
      k.startsWith('shadow-'),
    )) {
      expect(scope.getByText(`--${token}`)).toBeTruthy();
      const sample = container.querySelector(`[data-token-shadow="${token}"]`);
      expect(sample).toBeTruthy();
      expect((sample as HTMLElement).style.boxShadow).toBe(`var(--${token})`);
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

  it('copies a token css-var name to the clipboard when its copy control is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { container } = render(<TokensPage />);
    const token = colorTokens[0]!;

    const control = container.querySelector(
      `[data-copy-token-name="${token}"]`,
    ) as HTMLButtonElement;
    expect(control).toBeTruthy();
    fireEvent.click(control);

    expect(writeText).toHaveBeenCalledWith(`--${token}`);
  });

  it('copies a token literal value to the clipboard when its value copy control is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { container } = render(<TokensPage />);
    const token = colorTokens[0]!;

    const control = container.querySelector(
      `[data-copy-token-value="${token}"]`,
    ) as HTMLButtonElement;
    expect(control).toBeTruthy();
    fireEvent.click(control);

    expect(writeText).toHaveBeenCalledWith(globalTokens[token]);
  });
});

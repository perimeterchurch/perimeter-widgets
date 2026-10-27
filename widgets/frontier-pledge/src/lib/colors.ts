import type * as React from 'react';
import type { FrontierPledgeConfig } from '../types';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * A config color as CSS, or `undefined` when it is unset or not a hex color.
 * Unrecognized values fall back to the brand default instead of throwing: a
 * typo in a cosmetic `data-*` attribute should not take the pledge form down.
 */
export function cssColor(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && HEX_COLOR.test(trimmed) ? trimmed : undefined;
}

/**
 * Inline style for the widget root that re-points the theme tokens the band is
 * painted with. Every surface already reads these tokens (`bg-surface-dark`,
 * `text-surface-dark-fg`, `bg-warning`, `text-warning-fg`), so overriding them
 * at the root re-colors the form, the confirmation and their hover tints
 * together. Unset colors are left out so the theme's own value shows through.
 */
export function bandColorStyle(config: FrontierPledgeConfig): React.CSSProperties {
  const tokens: Record<string, string | undefined> = {
    '--color-surface-dark': cssColor(config.backgroundColor),
    '--color-surface-dark-fg': cssColor(config.textColor),
    '--color-warning': cssColor(config.accentColor),
    '--color-warning-fg': cssColor(config.buttonTextColor),
  };
  return Object.fromEntries(
    Object.entries(tokens).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

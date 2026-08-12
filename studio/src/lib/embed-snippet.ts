import { camelToKebab } from './data-attr';
import { CDN_BASE_URL } from './catalog';

/** HTML attribute-value escaping — configToDataAttrs interpolates raw (Inspector-only). */
export function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export type PreviewTheme = 'light' | 'dark';

/**
 * The FULL attribute set of a catalog embed div — used verbatim by BOTH the
 * CdnBundlePreview srcdoc and the copyable snippet, so they can never drift.
 * Every set override appears (no schema-default diffing; the playground's
 * override map starts empty). `data-theme` only when dark.
 */
export function serializeWidgetAttrs(
  slug: string,
  overrides: Record<string, unknown>,
  theme: PreviewTheme,
  /**
   * Optional `data-api-url` base. Used by the live Embed PREVIEW while
   * impersonating (to route the shipped bundle through the shell proxy) — NOT by
   * the copyable snippet, which must stay the canonical host-page form.
   */
  apiUrl?: string,
): string {
  const attrs = [`data-perimeter-widget="${escapeAttribute(slug)}"`];
  for (const key of Object.keys(overrides).sort()) {
    const value = overrides[key];
    if (value === undefined || value === null || value === '') continue;
    // ConfigPanel only emits primitives; JSON-encode anything else rather than
    // letting Object's default stringification leak "[object Object]".
    const text =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
    attrs.push(`data-${camelToKebab(key)}="${escapeAttribute(text)}"`);
  }
  if (theme === 'dark') attrs.push('data-theme="dark"');
  if (apiUrl) attrs.push(`data-api-url="${escapeAttribute(apiUrl)}"`);
  return attrs.join(' ');
}

/**
 * The copyable embed snippet — the canonical WordPress form from
 * docs/hosting-and-release.md (loader script first, data-nowprocket for WP
 * Rocket hosts, then the placeholder div).
 */
export function buildEmbedSnippet(
  slug: string,
  overrides: Record<string, unknown>,
  theme: PreviewTheme,
): string {
  return (
    `<script src="${CDN_BASE_URL}/loader.js" data-nowprocket async></script>\n` +
    `<div ${serializeWidgetAttrs(slug, overrides, theme)}></div>`
  );
}

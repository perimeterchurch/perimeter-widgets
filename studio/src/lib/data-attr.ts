/**
 * camelCase config key → the kebab `data-*` attribute name the runtime parses
 * (`parseDataAttrs` does the inverse kebab→camel). Lossless for the simple
 * camelCase schema keys widgets use (`perPage` → `per-page`).
 */
export function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Format a config value as a `data-*` attribute string value (booleans/numbers → string). */
function attrValue(value: unknown): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return String(value);
}

/**
 * Render the set config overrides as `data-*` attribute markup for the embed div,
 * e.g. `{ perPage: 20, defaultView: 'list' }` → ` data-per-page="20" data-default-view="list"`
 * (each attribute is space-prefixed so it appends directly after the widget attr).
 * Skips undefined/null/empty values so the embed shows only what's been set, and
 * sorts by key for a stable snippet. Mirrors the runtime's kebab→camel parsing.
 */
export function configToDataAttrs(config: Record<string, unknown>): string {
  return Object.keys(config)
    .filter((key) => {
      const v = config[key];
      return v !== undefined && v !== null && v !== '';
    })
    .sort()
    .map((key) => ` data-${camelToKebab(key)}="${attrValue(config[key])}"`)
    .join('');
}

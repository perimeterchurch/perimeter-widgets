/**
 * Words that read wrong when a camelCase key is split and sentence-cased.
 * "apiUrl" → "Api url" is worse than the key it replaced; "API URL" is not.
 */
const ACRONYMS: Record<string, string> = {
  api: 'API',
  cdn: 'CDN',
  css: 'CSS',
  html: 'HTML',
  id: 'ID',
  mp: 'MP',
  url: 'URL',
  urls: 'URLs',
};

/**
 * A readable name derived from a schema key: `showDescription` → "Show
 * description", `defaultImageUrl` → "Default image URL".
 *
 * The fallback for fields a widget has not labelled, so every widget's Configure
 * panel reads as prose rather than as identifiers even before anyone writes a
 * `configLabels` entry.
 */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word.toLowerCase());

  if (words.length === 0) return key;
  const [first, ...rest] = words as [string, ...string[]];
  // Only the first word is capitalized, and only when it is not an acronym we
  // just upper-cased.
  const head = first === first.toUpperCase() ? first : first[0]!.toUpperCase() + first.slice(1);
  return [head, ...rest].join(' ');
}

/**
 * The name to show for a field: the widget's own `configLabels` entry when it has
 * one, otherwise a humanized key. Never the raw key — that is shown separately as
 * the `data-*` attribute, which is the thing you actually type.
 */
export function fieldLabel(key: string, labels?: Partial<Record<string, string>>): string {
  const label = labels?.[key];
  return label && label.length > 0 ? label : humanizeKey(key);
}

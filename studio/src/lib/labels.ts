/**
 * Prettify a slug or kebab/snake identifier into a human Title Case label
 * (`spiritual-gifts` → `Spiritual Gifts`). Used for overview cards and breadcrumb
 * trails where a discovered slug is the only available name — widget/component
 * schemas carry no `.describe()`-style title today, so a derived label is the
 * honest best source (mirrors guide-docs' own title derivation).
 */
export function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

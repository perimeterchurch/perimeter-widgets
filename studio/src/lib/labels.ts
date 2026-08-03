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

/**
 * Display names that deliberately differ from the slug.
 *
 * A widget's slug is its PUBLIC identity — it is the `data-perimeter-widget`
 * value on every live host page and the `cdn/<slug>/<version>/` path of every
 * released bundle — so it cannot be renamed to change what the studio calls a
 * widget. Renaming `community-group-finder` would break the embeds already on
 * perimeter.org. This map is the seam: the slug stays put, the label changes.
 */
const WIDGET_TITLE_OVERRIDES: Record<string, string> = {
  'community-group-finder': 'Group Finder',
};

/**
 * The studio-facing name of a widget: an explicit override when one exists,
 * otherwise the slug prettified. Use this for every widget label (nav, cards,
 * breadcrumbs, page headings) rather than `titleFromSlug` directly — that one
 * also serves components and guides, which have no override concept.
 */
export function widgetTitle(slug: string): string {
  return WIDGET_TITLE_OVERRIDES[slug] ?? titleFromSlug(slug);
}

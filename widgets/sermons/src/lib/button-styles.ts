/**
 * Class overrides for `@perimeter/ui`'s Button, merged via its `className`
 * (tailwind-merge swaps the conflicting utilities).
 *
 * `ICON_GAP`: the shared Button sets no gap, so an icon + label renders touching
 * ("×Clear All"); every icon-and-text button in the widget adds this.
 *
 * `BRAND_BUTTON`: the detail pages' Back / Copy link, on Button's `primary`
 * variant — square, filled brand blue with white text like perimeter.org's own
 * buttons, a little darker on hover (the blue mixed with 12% black, from the
 * theme token so an embed's `data-theme-color-primary` override follows). White
 * on the brand blue is 2.15:1, below WCAG AA — the same deliberate brand match
 * as the blue filter links.
 */
export const ICON_GAP = 'gap-2';
export const BRAND_BUTTON = `${ICON_GAP} rounded-none text-white hover:bg-[color-mix(in_oklab,var(--color-primary),black_12%)]`;

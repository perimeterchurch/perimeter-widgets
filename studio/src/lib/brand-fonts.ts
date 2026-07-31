/**
 * Perimeter's Adobe Fonts (Typekit) kit, carrying the BRAND faces
 * (sweet-sans-pro, freight-display-pro).
 *
 * Widget bundles ship no `@font-face` of their own: their CSS *names*
 * `sweet-sans-pro` and relies on the embedding page to have loaded it.
 * perimeter.org loads its own kit, so live widgets get the real face; a page
 * that does not falls through the token stack to Inter.
 *
 * That makes this URL load-bearing in two separate places, because font
 * availability is scoped to a *document*:
 *
 * - `studio/index.html` — covers the studio document, and therefore every
 *   shadow-root preview inside it (shadow roots share the host document's fonts).
 * - each preview **iframe** srcdoc — a separate document, which inherits nothing
 *   from the studio. Without its own link, catalog previews silently rendered in
 *   Inter while the surrounding studio showed the real brand face.
 *
 * Keep the two in sync; `studio/src/lib/studio-font.test.ts` fails if they drift.
 */
export const BRAND_FONTS_CSS_URL = 'https://use.typekit.net/hpg7onr.css';

/**
 * The brand-font `<link>` for a preview iframe's srcdoc `<head>`, so the framed
 * widget renders in the same faces it will on perimeter.org.
 *
 * Deliberately NOT the studio chrome face (Geist): the point of a preview is to
 * show the widget as a host page will, and the host page is Perimeter-branded.
 */
export function brandFontsLinkTag(): string {
  return `<link rel="stylesheet" href="${BRAND_FONTS_CSS_URL}">`;
}

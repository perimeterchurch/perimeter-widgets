import * as React from 'react';

const STYLE_ID = 'perimeter-mission-trip-takeover';

/**
 * A selector is interpolated into a stylesheet, so it must not be able to close
 * the rule and add declarations of its own. The embed author already controls
 * the page, so this is not a privilege boundary — it stops a typo in a
 * `data-*` attribute from corrupting the host's CSS.
 */
export function isSafeSelector(selector: string): boolean {
  return selector.length > 0 && selector.length <= 500 && !/[{};@<]|\/\*/.test(selector);
}

/**
 * Hands the host page over to the open trip.
 *
 * **Why this is not an overlay.** The obvious implementation is a `position:
 * fixed` panel over the page. It cannot work from inside a widget, and not for
 * want of a big enough `z-index`. On perimeter.org the embed sits inside two
 * ancestors that are positioned with `z-index: 10`, and each of those starts a
 * stacking context — so everything the widget paints is confined to z-index 10
 * in the container's context, while the page's first row sits at z-index 100 in
 * that same context. Measured on the live page: a fixed child of the shadow
 * root at `z-index: 2147483647`, the largest value CSS allows, still lost to
 * that row at three of five sampled points. No value can win from in there.
 *
 * So the page is asked to stand down instead. Two mechanisms, both reversible:
 *
 *  - `data-screen` on the shadow host, so host CSS can react to a trip being
 *    open without any of this.
 *  - a stylesheet in `document.head` hiding whatever `hideSelector` names,
 *    which is how an embed hands over without the page needing its own CSS.
 *
 * Both are undone on close, along with the reader's place on the page: hiding
 * most of a page shortens it, and restoring the scroll afterwards is what puts
 * them back on the card they came from rather than wherever the shorter page
 * left them.
 */
export function usePageTakeover({
  enabled,
  screen,
  hideSelector,
  anchorRef,
}: {
  enabled: boolean;
  /** What the host should say is open. */
  screen: 'detail' | 'participant';
  /** Host page content to hide while a trip is open. */
  hideSelector: string | undefined;
  /** Any element inside the widget — used to find the shadow host. */
  anchorRef: React.RefObject<HTMLElement | null>;
}): void {
  // Effects below run on mount/unmount only. `screen` changing must retarget the
  // attribute without tearing the whole takeover down and restoring scroll
  // half-way through a visit, so it gets an effect of its own.
  React.useEffect(() => {
    if (!enabled) return;
    const host = hostOf(anchorRef.current);
    if (!host) return;
    host.setAttribute('data-screen', screen);
    return () => {
      host.removeAttribute('data-screen');
    };
  }, [enabled, screen, anchorRef]);

  React.useEffect(() => {
    if (!enabled || !hideSelector || !isSafeSelector(hideSelector)) return;

    const restoreTo = window.scrollY;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `${hideSelector}{display:none!important}`;
    document.head.appendChild(style);

    return () => {
      style.remove();
      // After the rule goes the page is its full height again, so the position
      // the reader came from is reachable once more. Restored on the next frame
      // because the layout has to settle first — a scroll into a page that is
      // still short gets clamped and stays there.
      requestAnimationFrame(() => window.scrollTo({ top: restoreTo, behavior: 'auto' }));
    };
  }, [enabled, hideSelector]);
}

function hostOf(el: Element | null): HTMLElement | null {
  if (!el) return null;
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? (root.host as HTMLElement) : (el as HTMLElement);
}

import * as React from 'react';

/**
 * Stretches its child across the full width of the host page, escaping
 * whatever content container the embed sits in (perimeter.org's is 1425px
 * with 90px of padding).
 *
 * Measured rather than done with `width: 100vw`, for two reasons:
 *
 * 1. `100vw` includes the vertical scrollbar. On every scrollbar-reserving
 *    browser that is ~15px of horizontal overflow on the host page — a real
 *    bug on a WordPress page that does not set `overflow-x: hidden`.
 *    `document.documentElement.clientWidth` excludes it.
 * 2. The `calc(50% - 50vw)` idiom assumes the embed is horizontally centred in
 *    the viewport. Measuring the host element's actual position works for an
 *    off-centre container too.
 *
 * The negative margins cancel the extra width so the element's margin box
 * still measures the host's width, and the breakout adds nothing to any
 * ancestor's scroll width.
 *
 * Not fixable from here: an ancestor with `overflow: hidden` or a `transform`
 * clips the breakout. The element degrades to its container width, which is
 * the pre-breakout rendering rather than anything broken.
 */
export function FullBleed({
  enabled,
  className,
  children,
}: {
  enabled: boolean;
  className?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!enabled) {
      el.style.marginLeft = '';
      el.style.marginRight = '';
      el.style.width = '';
      return;
    }

    // The shadow host is the element the page's container actually sizes; our
    // own width is about to be overwritten, so it cannot be the reference.
    const root = el.getRootNode();
    const anchor: Element | null =
      root instanceof ShadowRoot ? root.host : (el.parentElement ?? null);
    if (!anchor) return;

    const apply = () => {
      const rect = anchor.getBoundingClientRect();
      const pageWidth = document.documentElement.clientWidth;
      const left = `${-rect.left}px`;
      const right = `${-(pageWidth - rect.right)}px`;
      const width = `${pageWidth}px`;
      // Written only on change: the ResizeObserver below watches an ancestor,
      // and an unconditional write risks a resize -> write -> resize loop.
      if (el.style.width !== width) el.style.width = width;
      if (el.style.marginLeft !== left) el.style.marginLeft = left;
      if (el.style.marginRight !== right) el.style.marginRight = right;
    };

    apply();

    // Guarded: a missing ResizeObserver must not take the whole detail view
    // down with it. Without it the breakout still applies and still tracks the
    // window; it just stops following a container that resizes on its own
    // (a collapsing sidebar, a font swap reflowing the page).
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null;
    observer?.observe(anchor);
    window.addEventListener('resize', apply);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [enabled]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

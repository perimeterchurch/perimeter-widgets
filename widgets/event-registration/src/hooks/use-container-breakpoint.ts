import { useCallback, useLayoutEffect, useState } from 'react';
import { bucketFor, type ContainerBreakpoint } from '../lib/breakpoint';

export interface ContainerBreakpointHandle {
  /** Attach to the element whose inline size decides the layout (the widget root). */
  ref: (el: HTMLElement | null) => void;
  breakpoint: ContainerBreakpoint;
}

/**
 * Observe the widget root's inline size and return its container breakpoint.
 * Used only where a *different render branch* is needed (the sticky summary
 * bar, the bottom-sheet editor, the sticky CTA versus the desktop review
 * column); everything else stays pure CSS container queries.
 *
 * The root is a callback ref because the App renders a different root while
 * the event is loading: the observer must follow whichever element is
 * current, not the one present at first mount. A width of 0 means "not
 * measured yet" (jsdom, or a host that mounts the widget inside a hidden tab)
 * and keeps the current value rather than flipping to phone; the
 * ResizeObserver reports the real width once the element is laid out. State
 * changes only when the bucket crosses a threshold.
 */
export function useContainerBreakpoint(): ContainerBreakpointHandle {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [bp, setBp] = useState<ContainerBreakpoint>('desktop');
  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);

  useLayoutEffect(() => {
    if (!el) return;
    const apply = (width: number) => {
      if (width <= 0) return;
      const next = bucketFor(width);
      setBp((prev) => (prev === next ? prev : next));
    };
    apply(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries.find((e) => e.target === el);
      apply(entry?.contentBoxSize?.[0]?.inlineSize ?? el.clientWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return { ref, breakpoint: bp };
}

import { useLayoutEffect, useState, type RefObject } from 'react';
import { bucketFor, type ContainerBreakpoint } from '../lib/breakpoint';

/**
 * Observe an element's inline size and return its container breakpoint
 * ('phone' | 'tablet' | 'desktop'). Used only where a *different render branch*
 * is needed (the default view mode + compact toolbar / collapsible filters);
 * column counts stay pure CSS container queries. State changes only when the
 * bucket crosses a threshold, so a stable width causes no re-render churn.
 * useLayoutEffect does the initial measure before paint, so the first paint is
 * already correct (no grid→list flash on phones).
 */
export function useContainerBreakpoint(ref: RefObject<HTMLElement | null>): ContainerBreakpoint {
  const [bp, setBp] = useState<ContainerBreakpoint>('desktop');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = bucketFor(el.clientWidth);
      setBp((prev) => (prev === next ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return bp;
}

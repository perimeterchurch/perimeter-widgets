import { useEffect, type RefObject } from 'react';

/**
 * Closes a menu when the user clicks outside of `ref`. Listens at the
 * document level and resolves the true click origin with
 * `event.composedPath()[0]`, so it works on both sides of a shadow boundary:
 * host-page clicks reach the document listener (they never propagate INTO a
 * shadow root, so a shadow-root listener would miss them entirely), and
 * in-shadow clicks — whose `event.target` retargets to the shadow host at the
 * document level — are resolved back to the real inner element via the
 * composed path before the containment check.
 *
 * Uses `mousedown` rather than `click` so the menu closes before any click
 * handler inside an unrelated element fires.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const node = ref.current;
    const doc = node.ownerDocument;
    const handleClick = (e: Event) => {
      const target = (e.composedPath()[0] ?? e.target) as Node;
      if (!node.contains(target)) {
        onClickOutside();
      }
    };
    doc.addEventListener('mousedown', handleClick);
    return () => doc.removeEventListener('mousedown', handleClick);
  }, [ref, onClickOutside, enabled]);
}

import { useEffect, type RefObject } from 'react';

/**
 * Closes a menu when the user clicks outside of `ref`. Subscribes via the
 * element's root node so it works inside a shadow DOM (where `document`-level
 * listeners would not see events that retarget at the shadow boundary).
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
    const root = node.getRootNode() as Document | ShadowRoot;
    const handleClick = (e: Event) => {
      if (!node.contains(e.target as Node)) {
        onClickOutside();
      }
    };
    root.addEventListener('mousedown', handleClick);
    return () => root.removeEventListener('mousedown', handleClick);
  }, [ref, onClickOutside, enabled]);
}

import { useEffect, useState } from 'react';

/** The chrome theme as currently reflected on <html> (defaults to light). */
export function readChromeTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * Read-only subscription to the studio CHROME theme — the `data-theme` attribute
 * on `<html>` that the sidebar's `useStudioTheme` owns and writes. Re-renders the
 * caller whenever it flips, via a MutationObserver on that attribute.
 *
 * Use this where a component must FOLLOW the chrome theme without owning the
 * toggle: the gallery stage host and the widget-preview canvas's default theme.
 * It is deliberately distinct from `useStudioTheme` — a second `useStudioTheme`
 * instance holds its own state and would never observe the owner's toggle, so
 * sibling consumers must observe the DOM attribute instead.
 */
export function useChromeTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(readChromeTheme);
  useEffect(() => {
    const sync = () => setTheme(readChromeTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

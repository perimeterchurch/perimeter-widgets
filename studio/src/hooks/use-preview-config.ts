import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  decodePreviewState,
  encodePreviewState,
  PREVIEW_PARAM_KEYS,
  type PreviewBackground,
  type PreviewState,
  type PreviewViewport,
} from '../lib/preview-link';
import { readChromeTheme } from '../lib/use-chrome-theme';

/**
 * Bridges the shareable-preview codec (lib/preview-link) to the router's URL
 * search params, so the widget preview's tuned state (config overrides, token
 * overrides, theme, viewport) IS the URL — changing a control rewrites the query
 * string, and loading a URL with params hydrates the preview. The full state is
 * derived from `useSearchParams` (single source of truth, no shadow useState),
 * and each setter re-encodes the whole state with `replace` so tweaking controls
 * doesn't spam the history stack.
 */
export function usePreviewConfig() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => decodePreviewState(searchParams), [searchParams]);

  /**
   * Rewrite only the keys this codec owns, preserving every other param.
   *
   * The query string has other tenants: the widget page's `tab`, and
   * widget-specific params like sermons' `sermons-view`. Replacing the whole
   * string (what this used to do) silently dropped them — pinning a theme on the
   * Dev tab threw you back to Embed, because `tab=dev` vanished.
   */
  const commit = useCallback(
    (next: PreviewState) => {
      setSearchParams(
        (current) => {
          const merged = new URLSearchParams(current);
          for (const key of PREVIEW_PARAM_KEYS) merged.delete(key);
          for (const [key, value] of encodePreviewState(next)) merged.set(key, value);
          return merged;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setConfig = useCallback(
    (config: Record<string, unknown>) => commit({ ...state, config }),
    [commit, state],
  );
  const setTokens = useCallback(
    (tokens: Record<string, string>) => commit({ ...state, tokens }),
    [commit, state],
  );
  const setTheme = useCallback(
    (theme: 'light' | 'dark') => commit({ ...state, theme }),
    [commit, state],
  );
  const setViewport = useCallback(
    (viewport: PreviewViewport) => commit({ ...state, viewport }),
    [commit, state],
  );
  const setBackground = useCallback(
    (background: PreviewBackground) => commit({ ...state, background }),
    [commit, state],
  );

  /** Absolute, shareable URL for the given route path carrying the current state. */
  const buildShareUrl = useCallback(
    (pathname: string) => {
      // Pin the EFFECTIVE theme into the link: when the preview is following the
      // chrome theme (theme undefined), resolve it now so the recipient sees what
      // the sharer saw rather than re-inheriting their own chrome theme.
      const params = new URLSearchParams(searchParams);
      for (const key of PREVIEW_PARAM_KEYS) params.delete(key);
      for (const [key, value] of encodePreviewState({
        ...state,
        theme: state.theme ?? readChromeTheme(),
      })) {
        params.set(key, value);
      }
      const query = params.toString();
      const url = new URL(pathname, window.location.origin);
      url.search = query;
      return url.toString();
    },
    [state, searchParams],
  );

  return { state, setConfig, setTokens, setTheme, setViewport, setBackground, buildShareUrl };
}

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  decodePreviewState,
  encodePreviewState,
  type PreviewState,
  type PreviewViewport,
} from '../lib/preview-link';

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

  const commit = useCallback(
    (next: PreviewState) => {
      setSearchParams(encodePreviewState(next), { replace: true });
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

  /** Absolute, shareable URL for the given route path carrying the current state. */
  const buildShareUrl = useCallback(
    (pathname: string) => {
      const params = encodePreviewState(state);
      const query = params.toString();
      const url = new URL(pathname, window.location.origin);
      url.search = query;
      return url.toString();
    },
    [state],
  );

  return { state, setConfig, setTokens, setTheme, setViewport, buildShareUrl };
}

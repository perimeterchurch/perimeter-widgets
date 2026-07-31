/**
 * Codec for shareable widget-preview links. A tuned preview (config overrides,
 * runtime token overrides, light/dark theme, viewport width) is serialized into
 * URL query params so the exact state can be copied, bookmarked, or opened in the
 * standalone `/preview/:slug` route. Encoding omits defaults to keep the URL
 * clean, and decoding is deliberately total — a hand-edited or stale link must
 * degrade to a sane default rather than throw and white-screen the SPA.
 */

/** A preset viewport id, or an explicit custom pixel width. */
export type PreviewViewport = 'mobile' | 'tablet' | 'desktop' | 'fluid' | { custom: number };

/**
 * The canvas background surface painted behind the preview frame. `host-sim` is
 * the default (the production-truth HostFrame). Persisted in the share link so a
 * dialed-in inspection surface travels with the link; the DEV-only Source⇄Built
 * toggle is deliberately NOT persisted (it's gated by `import.meta.env.DEV` and
 * tree-shaken from prod, so a `source=built` link is non-reproducible).
 */
export type PreviewBackground = 'white' | 'gray' | 'dark' | 'host-sim';

/**
 * The CSS surface painted behind the preview frame for each background. Shared by
 * the Canvas Surface control AND the standalone /preview route so a shared `bg=`
 * link paints the same surface in both. `host-sim` stays neutral here because the
 * HostFrame supplies its own #fff body on top.
 */
export const BACKGROUND_SURFACES: Record<PreviewBackground, string> = {
  white: '#ffffff',
  gray: '#f3f4f6',
  dark: '#1e1e1e',
  'host-sim': '#e9ebef',
};

const BACKGROUNDS = ['white', 'gray', 'dark', 'host-sim'] as const;
const DEFAULT_BACKGROUND: PreviewBackground = 'host-sim';

export interface PreviewState {
  /** data-* config overrides, keyed by camelCase (mirrors ConfigPanel output). */
  config: Record<string, unknown>;
  /** runtime theme token overrides (mirrors ThemeEditor output). */
  tokens: Record<string, string>;
  /**
   * The widget preview's light/dark theme, or `undefined` to FOLLOW the studio
   * chrome theme. Absent from the URL until the canvas toggle pins one explicitly
   * — so darkening the studio also darkens the preview by default, while a pinned
   * value (either light or dark) travels in the share link and wins over chrome.
   */
  theme: 'light' | 'dark' | undefined;
  viewport: PreviewViewport;
  /** Canvas surface behind the frame (mirrors Canvas's Surface control). */
  background: PreviewBackground;
}

const PRESET_VIEWPORTS = ['mobile', 'tablet', 'desktop', 'fluid'] as const;

/**
 * Every search-param key this codec owns. Exported so a caller rewriting the URL
 * can clear exactly these and leave everything else alone — the query string is
 * shared with params this codec knows nothing about (the widget page's `tab`, and
 * widget-specific ones like sermons' `sermons-view`), and blindly replacing it
 * drops them.
 */
export const PREVIEW_PARAM_KEYS = ['config', 'tokens', 'theme', 'viewport', 'bg'] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Encode a full preview state into URL search params, omitting defaults. */
export function encodePreviewState(state: PreviewState): URLSearchParams {
  const params = new URLSearchParams();

  if (Object.keys(state.config).length > 0) {
    params.set('config', JSON.stringify(state.config));
  }
  if (Object.keys(state.tokens).length > 0) {
    params.set('tokens', JSON.stringify(state.tokens));
  }
  // Only a pinned theme is written; `undefined` (follow chrome) stays out of the
  // URL. Both light and dark are written when pinned so a pinned-light preview
  // survives even when the recipient's chrome is dark.
  if (state.theme) {
    params.set('theme', state.theme);
  }
  if (state.viewport !== 'fluid') {
    const value =
      typeof state.viewport === 'object' ? String(state.viewport.custom) : state.viewport;
    params.set('viewport', value);
  }
  if (state.background !== DEFAULT_BACKGROUND) {
    params.set('bg', state.background);
  }

  return params;
}

/** Parse a JSON object param, returning {} on absence or any malformed input. */
function parseRecord(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlainRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseViewport(raw: string | null): PreviewViewport {
  if (!raw) return 'fluid';
  if ((PRESET_VIEWPORTS as readonly string[]).includes(raw)) {
    return raw as PreviewViewport;
  }
  const px = Number(raw);
  return Number.isFinite(px) && px > 0 ? { custom: px } : 'fluid';
}

function parseBackground(raw: string | null): PreviewBackground {
  return raw && (BACKGROUNDS as readonly string[]).includes(raw)
    ? (raw as PreviewBackground)
    : DEFAULT_BACKGROUND;
}

/** Decode preview state from URL search params. Total — never throws. */
export function decodePreviewState(params: URLSearchParams): PreviewState {
  const tokensRaw = parseRecord(params.get('tokens'));
  // Token overrides are always string-valued; coerce defensively.
  const tokens: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokensRaw)) tokens[k] = String(v);

  return {
    config: parseRecord(params.get('config')),
    tokens,
    theme:
      params.get('theme') === 'dark'
        ? 'dark'
        : params.get('theme') === 'light'
          ? 'light'
          : undefined,
    viewport: parseViewport(params.get('viewport')),
    background: parseBackground(params.get('bg')),
  };
}

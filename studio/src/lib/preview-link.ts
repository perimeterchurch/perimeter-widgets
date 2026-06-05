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

export interface PreviewState {
  /** data-* config overrides, keyed by camelCase (mirrors ConfigPanel output). */
  config: Record<string, unknown>;
  /** runtime theme token overrides (mirrors ThemeEditor output). */
  tokens: Record<string, string>;
  theme: 'light' | 'dark';
  viewport: PreviewViewport;
}

const PRESET_VIEWPORTS = ['mobile', 'tablet', 'desktop', 'fluid'] as const;

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
  if (state.theme === 'dark') {
    params.set('theme', 'dark');
  }
  if (state.viewport !== 'fluid') {
    const value =
      typeof state.viewport === 'object' ? String(state.viewport.custom) : state.viewport;
    params.set('viewport', value);
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

/** Decode preview state from URL search params. Total — never throws. */
export function decodePreviewState(params: URLSearchParams): PreviewState {
  const tokensRaw = parseRecord(params.get('tokens'));
  // Token overrides are always string-valued; coerce defensively.
  const tokens: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokensRaw)) tokens[k] = String(v);

  return {
    config: parseRecord(params.get('config')),
    tokens,
    theme: params.get('theme') === 'dark' ? 'dark' : 'light',
    viewport: parseViewport(params.get('viewport')),
  };
}

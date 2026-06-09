import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { cn } from '@perimeter/ui/utils/cn';
import { HostFrame } from './HostFrame';
import { BuiltBundlePreview } from './BuiltBundlePreview';
import {
  BACKGROUND_SURFACES,
  type PreviewBackground,
  type PreviewViewport,
} from '../lib/preview-link';

/**
 * The preview source: the live source-mounted widget (`mount()`, dev React + dev
 * CSS) vs the shipped built IIFE in an iframe. "Built" is a DEV-only final
 * pre-release check; the toggle and BuiltBundlePreview are gated behind
 * `import.meta.env.DEV` so Rollup tree-shakes them out of the deployed site.
 */
type PreviewSource = 'source' | 'built';

/**
 * Viewport-width presets for the preview canvas. `null` means fluid — the frame
 * stretches to the canvas width with no fixed constraint, matching a full-width
 * host page. The px values are the conventional mobile/tablet/desktop breakpoints
 * the design system targets.
 */
const PRESETS = [
  { id: 'mobile', label: 'Mobile', px: 375 },
  { id: 'tablet', label: 'Tablet', px: 768 },
  { id: 'desktop', label: 'Desktop', px: 1280 },
  { id: 'fluid', label: 'Fluid', px: null },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

/**
 * Background surfaces for the preview canvas. White / gray / dark are neutral
 * inspection surfaces (white = the typical host body, dark = exposes transparent
 * widget edges, gray = a calm default). `host-sim` is the production-truth canvas:
 * it swaps the plain surface for the Phase-2 HostFrame, which supplies its own
 * 19px/35px typography + #fff background and the measured content-frame width
 * (parity finding H4). The CSS surface painted behind the frame comes from the
 * shared BACKGROUND_SURFACES map (one source of truth with the /preview route);
 * for host-sim the surface stays neutral because HostFrame paints its own body.
 */
const BACKGROUNDS = [
  { id: 'white', label: 'White' },
  { id: 'gray', label: 'Gray' },
  { id: 'dark', label: 'Dark' },
  { id: 'host-sim', label: 'Host-sim' },
] as const;

// The surface id IS the shareable PreviewBackground (single source of truth in
// preview-link). Aliasing the table-derived ids to that codec union keeps the
// BACKGROUNDS table and the codec from drifting apart — a mismatch is a type error.
type BackgroundId = (typeof BACKGROUNDS)[number]['id'] & PreviewBackground;

/**
 * The preview canvas: a toolbar of viewport-width presets + a custom-width
 * override and a background toggle, above a centered frame that constrains
 * `children` (the preview) to the chosen width. A non-empty custom width always
 * wins over the active preset, so a developer can dial in an arbitrary
 * breakpoint. Fluid (and an empty custom field) leave the frame unconstrained.
 *
 * The frame carries `data-canvas-frame` so the render test can read the resolved
 * inline width without coupling to the children's markup; the scroll surface
 * carries `data-canvas-surface` so the test can read the active background.
 *
 * `slug`, when present (the widget route), enables a DEV-only Source ⇄ Built
 * toggle that swaps the source-mounted `children` for the shipped built IIFE
 * (BuiltBundlePreview). The toggle never renders outside DEV.
 *
 * `theme` + `onThemeChange`, when provided (the widget route), render a Light/Dark
 * segmented control in the toolbar. Canvas takes the preview as opaque `children`,
 * so it can't set `data-theme` on the host itself — the parent lifts the state,
 * applies it to the WidgetPreview host, and drives this control here.
 *
 * `viewport` + `onViewportChange`, when provided (the widget route), make the
 * viewport-width selection controlled so it can be persisted in the shareable
 * preview URL. Absent both, Canvas falls back to its own internal preset/custom
 * state (the design-system pages still embed Canvas uncontrolled).
 *
 * `background` + `onBackgroundChange`, when provided (the widget route), make the
 * surface selection controlled so it too persists in the shareable preview URL.
 * Absent both, Canvas keeps its own internal surface state.
 *
 * Keyboard shortcuts (widget route): 1/2/3/4 pick the viewport presets, `t`
 * toggles the widget theme (when `onThemeChange` is wired). They no-op while a
 * form control is focused so typing a custom width never triggers a preset.
 */
export function Canvas({
  children,
  slug,
  theme,
  onThemeChange,
  viewport: viewportProp,
  onViewportChange,
  background: backgroundProp,
  onBackgroundChange,
}: {
  children: ReactNode;
  slug?: string;
  theme?: 'light' | 'dark';
  onThemeChange?: (next: 'light' | 'dark') => void;
  viewport?: PreviewViewport;
  onViewportChange?: (next: PreviewViewport) => void;
  background?: PreviewBackground;
  onBackgroundChange?: (next: PreviewBackground) => void;
}) {
  // Uncontrolled fallback state — used only when the parent does not pass a
  // controlled `viewport`. The controlled path derives preset/customPx from the
  // single `viewport` value so the URL stays the source of truth.
  const [internalPreset, setInternalPreset] = useState<PresetId>('fluid');
  const [internalCustomPx, setInternalCustomPx] = useState('');
  const [internalBackground, setInternalBackground] = useState<BackgroundId>('host-sim');
  const [source, setSource] = useState<PreviewSource>('source');

  const backgroundControlled = onBackgroundChange !== undefined;
  const background: BackgroundId = backgroundControlled
    ? (backgroundProp ?? 'host-sim')
    : internalBackground;
  const setBackground = (id: BackgroundId) => {
    if (backgroundControlled) onBackgroundChange?.(id);
    else setInternalBackground(id);
  };

  const controlled = onViewportChange !== undefined;
  const viewport: PreviewViewport = controlled
    ? (viewportProp ?? 'fluid')
    : typeof internalCustomPx === 'string' &&
        internalCustomPx.trim() !== '' &&
        Number(internalCustomPx) > 0
      ? { custom: Number(internalCustomPx) }
      : internalPreset;

  const preset: PresetId = typeof viewport === 'object' ? internalPreset : viewport;
  const customPx = typeof viewport === 'object' ? String(viewport.custom) : '';

  const selectPreset = (id: PresetId) => {
    if (controlled) onViewportChange?.(id);
    else {
      setInternalPreset(id);
      setInternalCustomPx('');
    }
  };
  const selectCustom = (raw: string) => {
    if (controlled) {
      const px = Number(raw);
      onViewportChange?.(raw.trim() !== '' && px > 0 ? { custom: px } : preset);
    } else {
      setInternalCustomPx(raw);
    }
  };

  // Canvas keyboard shortcuts (widget route only — gated on a wired theme toggle,
  // which the design-system embeds don't pass): 1/2/3/4 select the viewport
  // presets in toolbar order, `t` toggles the widget theme. Bail while a form
  // control or contenteditable owns focus so typing a custom width or editing a
  // token field never fires a shortcut, and ignore modified chords so browser/OS
  // shortcuts (Cmd-1 tab switch, etc.) pass through untouched.
  const shortcutsEnabled = onThemeChange !== undefined;
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement as HTMLElement | null;
    const tag = el?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
    const presetByKey: Record<string, PresetId> = {
      '1': 'mobile',
      '2': 'tablet',
      '3': 'desktop',
      '4': 'fluid',
    };
    const next = presetByKey[e.key];
    if (next) {
      e.preventDefault();
      selectPreset(next);
    } else if (e.key.toLowerCase() === 't' && theme && onThemeChange) {
      e.preventDefault();
      onThemeChange(theme === 'dark' ? 'light' : 'dark');
    }
  };
  useEffect(() => {
    if (!shortcutsEnabled) return;
    const handler = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsEnabled]);

  // DEV-only: the Built view requires a slug to resolve the on-disk bundle, and
  // the whole feature must tree-shake out of the deployed build. import.meta.env.DEV
  // is statically false in a prod build, so Rollup drops the toggle + iframe path.
  const showBuiltToggle = import.meta.env.DEV && slug !== undefined;
  const showBuilt = showBuiltToggle && source === 'built';

  const presetPx = PRESETS.find((p) => p.id === preset)?.px ?? null;
  const customActive = typeof viewport === 'object';
  const resolvedPx = customActive ? viewport.custom : presetPx;
  const width = resolvedPx === null ? undefined : `${resolvedPx}px`;

  const surface = BACKGROUND_SURFACES[background];
  const hostSim = background === 'host-sim';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-bg px-4 py-2.5">
        <div className="flex items-center gap-2" role="group" aria-label="Viewport width presets">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
            Viewport
          </span>
          <div className="flex items-center gap-1">
            {PRESETS.map((p) => {
              const isActive = !customActive && preset === p.id;
              return (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'secondary' : 'ghost'}
                  aria-pressed={isActive}
                  onClick={() => selectPreset(p.id)}
                  className={cn(!isActive && 'text-muted-fg')}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <label
            htmlFor="canvas-custom-width"
            className="ml-1 text-xs font-medium uppercase tracking-wider text-muted-fg"
          >
            Custom
          </label>
          <Input
            id="canvas-custom-width"
            type="number"
            inputMode="numeric"
            min={1}
            aria-label="Custom width in pixels"
            placeholder="px"
            value={customPx}
            onChange={(e) => selectCustom(e.target.value)}
            className={cn('h-8 w-24', customActive && 'border-primary ring-1 ring-primary')}
          />
          <span className="ml-1 text-xs tabular-nums text-muted-fg">
            {width ? `${resolvedPx}px` : 'Fluid'}
          </span>
        </div>

        {showBuiltToggle && (
          <>
            <Divider />
            <div className="flex items-center gap-2" role="group" aria-label="Preview source">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
                [DEV] Source
              </span>
              {/* Segmented control matching the surface toggle: Source ⇄ Built. */}
              <div className="flex items-center overflow-hidden rounded-md border border-border">
                {(
                  [
                    { id: 'source', label: 'Source' },
                    { id: 'built', label: 'Built' },
                  ] as const
                ).map((opt, i) => {
                  const isActive = source === opt.id;
                  return (
                    <Button
                      key={opt.id}
                      type="button"
                      size="sm"
                      variant={isActive ? 'secondary' : 'ghost'}
                      aria-pressed={isActive}
                      onClick={() => setSource(opt.id)}
                      className={cn(
                        'rounded-none border-0',
                        i > 0 && 'border-l border-border',
                        !isActive && 'text-muted-fg',
                      )}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {onThemeChange && (
          <div className="ml-auto flex items-center gap-2" role="group" aria-label="Preview theme">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
              Theme
            </span>
            {/* Light/Dark segmented control — drives data-theme on the preview
                host (via the lifted parent state). This is the WIDGET theme; it
                is deliberately separated from the canvas Surface buttons below
                (own group + divider), which only paint the canvas behind the
                frame and never touch the widget's theme. */}
            <div className="flex items-center overflow-hidden rounded-md border border-border">
              {(
                [
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                ] as const
              ).map((opt, i) => {
                const isActive = theme === opt.id;
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant={isActive ? 'secondary' : 'ghost'}
                    aria-pressed={isActive}
                    onClick={() => onThemeChange(opt.id)}
                    className={cn(
                      'rounded-none border-0',
                      i > 0 && 'border-l border-border',
                      !isActive && 'text-muted-fg',
                    )}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {onThemeChange && <Divider />}

        <div
          className={cn('flex items-center gap-2', !onThemeChange && 'ml-auto')}
          role="group"
          aria-label="Canvas surface"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
            Surface
          </span>
          {/* Segmented control: one rounded shell with hairline dividers so the
              options read as a single switch rather than four loose buttons. */}
          <div className="flex items-center overflow-hidden rounded-md border border-border">
            {BACKGROUNDS.map((b, i) => {
              const isActive = background === b.id;
              return (
                <Button
                  key={b.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'secondary' : 'ghost'}
                  aria-pressed={isActive}
                  onClick={() => setBackground(b.id)}
                  className={cn(
                    'rounded-none border-0',
                    i > 0 && 'border-l border-border',
                    !isActive && 'text-muted-fg',
                  )}
                >
                  {b.label}
                </Button>
              );
            })}
          </div>
        </div>

        {shortcutsEnabled && <ShortcutsHint />}
      </div>

      <div
        data-canvas-surface
        className="min-h-0 flex-1 overflow-auto p-6"
        style={{ background: surface }}
      >
        <div data-canvas-frame style={{ width, marginInline: 'auto' }}>
          {/* Built view: the shipped IIFE in its own iframe document — it brings
              its own host page, so it skips HostFrame. Source view keeps the
              host-sim/background framing around the live mount. */}
          {showBuilt && slug !== undefined ? (
            <BuiltBundlePreview slug={slug} />
          ) : hostSim ? (
            <HostFrame frameWidth={resolvedPx ?? undefined}>{children}</HostFrame>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A thin vertical hairline that visually separates the toolbar's control
 * clusters (Viewport · Source · Theme · Surface) so the strip reads as distinct
 * groups rather than one undifferentiated run of buttons. Hidden from the
 * accessibility tree — the `role="group"` + label on each cluster carries the
 * semantics. `self-stretch` lets it match the toolbar row height, and it
 * collapses gracefully when the toolbar wraps (it just ends a wrapped row).
 */
function Divider() {
  return <span aria-hidden className="h-5 w-px shrink-0 self-center bg-border" />;
}

/**
 * A compact keyboard-shortcut hint for the canvas: a `?` chip that, on hover or
 * focus, reveals the available shortcuts (1–4 viewport presets, `t` theme). The
 * `title` makes the same legend reachable without hover (and to screen readers
 * via the accessible name), so the hint is informational, not a control.
 */
function ShortcutsHint() {
  return (
    <span
      tabIndex={0}
      className="inline-flex select-none items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title="Keyboard: 1–4 set viewport (Mobile/Tablet/Desktop/Fluid), t toggles theme"
      aria-label="Keyboard shortcuts: 1 through 4 set the viewport; t toggles the theme"
    >
      <Kbd>1</Kbd>
      <Kbd>4</Kbd>
      <span aria-hidden>viewport</span>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <Kbd>t</Kbd>
      <span aria-hidden>theme</span>
    </span>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 font-mono text-[0.65rem] leading-4 text-fg">
      {children}
    </kbd>
  );
}

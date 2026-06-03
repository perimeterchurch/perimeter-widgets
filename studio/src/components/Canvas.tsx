import { useState, type ReactNode } from 'react';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { cn } from '@perimeter/ui/utils/cn';
import { HostFrame } from './HostFrame';

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
 * (parity finding H4). `surface` is the CSS background painted behind the frame;
 * for host-sim the surface stays neutral because HostFrame paints its own body.
 */
const BACKGROUNDS = [
  { id: 'white', label: 'White', surface: '#ffffff' },
  { id: 'gray', label: 'Gray', surface: '#f3f4f6' },
  { id: 'dark', label: 'Dark', surface: '#1e1e1e' },
  { id: 'host-sim', label: 'Host-sim', surface: '#e9ebef' },
] as const;

type BackgroundId = (typeof BACKGROUNDS)[number]['id'];

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
 */
export function Canvas({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PresetId>('fluid');
  const [customPx, setCustomPx] = useState('');
  const [background, setBackground] = useState<BackgroundId>('host-sim');

  const presetPx = PRESETS.find((p) => p.id === preset)?.px ?? null;
  const customActive = customPx.trim() !== '' && Number(customPx) > 0;
  const resolvedPx = customActive ? Number(customPx) : presetPx;
  const width = resolvedPx === null ? undefined : `${resolvedPx}px`;

  const surface = BACKGROUNDS.find((b) => b.id === background)?.surface;
  const hostSim = background === 'host-sim';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-bg px-4 py-2.5">
        <div className="flex items-center gap-1" role="group" aria-label="Viewport width presets">
          {PRESETS.map((p) => {
            const isActive = !customActive && preset === p.id;
            return (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={isActive ? 'secondary' : 'ghost'}
                aria-pressed={isActive}
                onClick={() => {
                  setPreset(p.id);
                  setCustomPx('');
                }}
                className={cn(!isActive && 'text-muted-fg')}
              >
                {p.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="canvas-custom-width"
            className="text-xs font-medium uppercase tracking-wider text-muted-fg"
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
            onChange={(e) => setCustomPx(e.target.value)}
            className={cn('h-8 w-24', customActive && 'border-primary ring-1 ring-primary')}
          />
        </div>

        <div
          className="ml-auto flex items-center gap-2"
          role="group"
          aria-label="Canvas background"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
            Background
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

        <span className="text-xs tabular-nums text-muted-fg">
          {width ? `${resolvedPx}px` : 'Fluid'}
        </span>
      </div>

      <div data-canvas-surface className="flex-1 overflow-auto p-6" style={{ background: surface }}>
        <div data-canvas-frame style={{ width, marginInline: 'auto' }}>
          {hostSim ? <HostFrame>{children}</HostFrame> : children}
        </div>
      </div>
    </div>
  );
}

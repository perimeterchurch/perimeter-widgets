import { useState, type ReactNode } from 'react';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { cn } from '@perimeter/ui/utils/cn';

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
 * The preview canvas: a toolbar of viewport-width presets + a custom-width
 * override, above a centered frame that constrains `children` (the preview) to
 * the chosen width. A non-empty custom width always wins over the active preset,
 * so a developer can dial in an arbitrary breakpoint. Fluid (and an empty custom
 * field) leave the frame unconstrained.
 *
 * The frame carries `data-canvas-frame` so the render test can read the resolved
 * inline width without coupling to the children's markup.
 */
export function Canvas({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PresetId>('fluid');
  const [customPx, setCustomPx] = useState('');

  const presetPx = PRESETS.find((p) => p.id === preset)?.px ?? null;
  const customActive = customPx.trim() !== '' && Number(customPx) > 0;
  const resolvedPx = customActive ? Number(customPx) : presetPx;
  const width = resolvedPx === null ? undefined : `${resolvedPx}px`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-bg px-4 py-2.5">
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

        <span className="ml-auto text-xs tabular-nums text-muted-fg">
          {width ? `${resolvedPx}px` : 'Fluid'}
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-muted/40 p-6">
        <div data-canvas-frame style={{ width, marginInline: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

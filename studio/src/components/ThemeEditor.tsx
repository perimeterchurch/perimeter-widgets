import { globalTokens, type ThemeToken } from '@perimeter/theme';
import { Button } from '@perimeter/ui/button';

interface Props {
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/** Group tokens by their prefix so the editor reads as Colors / Radii / Fonts. */
const GROUPS: { label: string; prefix: ThemeToken extends `${infer P}-${string}` ? P : never }[] = [
  { label: 'Colors', prefix: 'color' },
  { label: 'Radii', prefix: 'radius' },
  { label: 'Fonts', prefix: 'font' },
];

const tokenKeys = Object.keys(globalTokens) as ThemeToken[];

/**
 * Coerce a token color value into the `#rrggbb` a native `<input type="color">`
 * requires. Token defaults are space-separated `hsl(H S% L%)`; overrides may be
 * hex or anything the text input accepts. Returns `#000000` for values that
 * aren't a recognizable hex or `hsl()` (the picker can't represent them, but the
 * text input still owns the real value) so the control never throws.
 */
function toHexColor(value: string): string {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (hex) {
    const h = hex[1] ?? '';
    return `#${h.length === 3 ? h.replace(/./g, (c) => c + c) : h}`.toLowerCase();
  }
  const hsl = trimmed.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i);
  if (hsl) {
    const hue = parseFloat(hsl[1] ?? '0');
    const sat = parseFloat(hsl[2] ?? '0') / 100;
    const light = parseFloat(hsl[3] ?? '0') / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;
    const rgb =
      hue < 60
        ? [c, x, 0]
        : hue < 120
          ? [x, c, 0]
          : hue < 180
            ? [0, c, x]
            : hue < 240
              ? [0, x, c]
              : hue < 300
                ? [x, 0, c]
                : [c, 0, x];
    return `#${rgb
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
  }
  return '#000000';
}

export function ThemeEditor({ overrides, onChange }: Props) {
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Theme tokens
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasOverrides}
          onClick={() => onChange({})}
        >
          Reset
        </Button>
      </div>

      {GROUPS.map(({ label, prefix }) => {
        const keys = tokenKeys.filter((token) => token.startsWith(`${prefix}-`));
        if (keys.length === 0) return null;
        return (
          <fieldset key={prefix} className="flex flex-col gap-2">
            <legend className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-fg/80">
              {label}
            </legend>
            {keys.map((token) => {
              const overridden = token in overrides;
              const fieldId = `theme-token-${token}`;
              return (
                // A plain row, NOT a wrapping <label>: a <label> associates with its
                // first labelable descendant, which (with the color input present)
                // would steal the accessible name from the value text input and make
                // a name click open the picker. Each control is named explicitly
                // instead — the picker via aria-label, the text input via htmlFor.
                <div
                  key={token}
                  className="grid grid-cols-[minmax(6rem,auto)_1fr] items-center gap-2"
                >
                  <span className="flex items-center gap-1.5 truncate text-sm text-fg">
                    {prefix === 'color' && (
                      // Native picker doubles as the swatch: changing it writes the
                      // same override key as the text input, so the two stay in sync.
                      <input
                        type="color"
                        aria-label={`${token} color`}
                        data-color-token={token}
                        className="size-4 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0"
                        value={toHexColor(overrides[token] ?? globalTokens[token])}
                        onChange={(e) => onChange({ ...overrides, [token]: e.target.value })}
                      />
                    )}
                    <label htmlFor={fieldId} className="truncate font-mono text-xs">
                      {token}
                    </label>
                  </span>
                  <input
                    id={fieldId}
                    aria-label={token}
                    className="rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs text-fg transition-colors hover:border-fg/30 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 data-[overridden=true]:border-primary/60"
                    data-overridden={overridden}
                    data-text-token={token}
                    value={overrides[token] ?? globalTokens[token]}
                    onChange={(e) => onChange({ ...overrides, [token]: e.target.value })}
                  />
                </div>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

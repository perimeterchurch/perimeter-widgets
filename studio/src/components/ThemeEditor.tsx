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
              return (
                <label
                  key={token}
                  className="grid grid-cols-[1fr_minmax(0,9rem)] items-center gap-2"
                >
                  <span className="flex items-center gap-1.5 truncate text-sm text-fg">
                    {prefix === 'color' && (
                      <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full border border-border"
                        style={{ background: overrides[token] ?? globalTokens[token] }}
                      />
                    )}
                    <span className="truncate font-mono text-xs">{token}</span>
                  </span>
                  <input
                    className="rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs text-fg transition-colors hover:border-fg/30 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 data-[overridden=true]:border-primary/60"
                    data-overridden={overridden}
                    value={overrides[token] ?? globalTokens[token]}
                    onChange={(e) => onChange({ ...overrides, [token]: e.target.value })}
                  />
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

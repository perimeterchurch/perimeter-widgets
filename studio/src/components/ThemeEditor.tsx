import { globalTokens, type ThemeToken } from '@perimeter/theme';

interface Props {
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function ThemeEditor({ overrides, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="font-semibold">Theme tokens</h3>
      {(Object.keys(globalTokens) as ThemeToken[]).map((token) => (
        <label key={token} className="grid grid-cols-2 items-center gap-2 text-sm">
          <span className="truncate">{token}</span>
          <input
            className="rounded border px-2 py-1"
            defaultValue={globalTokens[token]}
            onChange={(e) => onChange({ ...overrides, [token]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

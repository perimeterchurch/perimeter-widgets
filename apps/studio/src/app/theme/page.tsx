'use client';
import * as React from 'react';
import { globalTokens, type ThemeToken } from '@perimeter/theme';
import { useThemeOverrides } from '@/lib/theme-overrides-context';

export default function ThemePage(): React.JSX.Element {
  const { overrides, setOverride, resetOverride } = useThemeOverrides();
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Theme editor</h1>
      <p className="text-sm text-muted-fg">Edits apply live to every preview on the site.</p>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Token</th>
            <th className="text-left">Default</th>
            <th className="text-left">Override</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(globalTokens) as ThemeToken[]).map((t) => (
            <tr key={t} className="border-t">
              <td className="py-1 pr-4 font-mono">{t}</td>
              <td className="py-1 pr-4 font-mono">{globalTokens[t]}</td>
              <td className="py-1 pr-4 flex gap-2 items-center">
                <input
                  value={overrides[t] ?? ''}
                  onChange={(e) => setOverride(t, e.target.value)}
                  placeholder="(default)"
                  className="border px-1 w-64 text-xs"
                />
                {overrides[t] && (
                  <button onClick={() => resetOverride(t)} className="text-xs underline">
                    reset
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

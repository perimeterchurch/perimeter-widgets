import * as React from 'react';
import type { GivingHistoryItem } from '@perimeter/api-hooks';
import { formatCurrency, formatCurrencyCompact } from '../lib/format';
import { totalsByYear } from '../lib/giving';

/**
 * Total giving per year as a simple bar chart. Dependency-free (no charting
 * library) and pure CSS height — robust inside the widget's shadow root where
 * portal-based SVG chart libs and their measured layouts are fragile.
 */
export function GivingChart({ items }: { items: GivingHistoryItem[] }): React.JSX.Element | null {
  const data = totalsByYear(items);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.total), 0);

  return (
    <section className="rounded-lg border border-border p-4" aria-label="Giving by year">
      <h3 className="mb-3 text-sm font-medium text-muted-fg">Giving by year</h3>
      <div className="flex items-end gap-3" style={{ height: 180 }}>
        {data.map((d) => {
          const heightPct = max > 0 ? Math.max((d.total / max) * 100, 2) : 0;
          return (
            <div
              key={d.year}
              className="flex flex-1 flex-col items-center justify-end gap-2"
              title={`${d.year}: ${formatCurrency(d.total)}`}
            >
              <span className="text-xs tabular-nums text-muted-fg">
                {formatCurrencyCompact(d.total)}
              </span>
              <div
                className="w-full max-w-16 rounded-t bg-primary"
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-xs text-muted-fg">{d.year}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

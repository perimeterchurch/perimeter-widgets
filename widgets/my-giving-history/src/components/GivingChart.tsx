import * as React from 'react';
import type { GivingHistoryItem } from '@perimeter/api-hooks';
import { formatCurrency, formatCurrencyCompact } from '../lib/format';
import { totalsByYear } from '../lib/giving';

/** Tallest bar, in px. Bars scale against this; labels add ~2 lines above/below. */
const MAX_BAR_PX = 140;

/**
 * Total giving per year as a simple bar chart. Dependency-free (no charting
 * library) and robust inside the widget's shadow root where portal-based SVG
 * chart libs and their measured layouts are fragile. Bar heights are computed
 * in px (not %): a percentage height needs a definite-height parent, and the
 * flex column here sizes to its content, so a % would collapse to zero.
 */
export function GivingChart({ items }: { items: GivingHistoryItem[] }): React.JSX.Element | null {
  const data = totalsByYear(items);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.total), 0);

  return (
    <section className="rounded-lg border border-border p-4" aria-label="Giving by year">
      <h3 className="mb-3 text-sm font-medium text-muted-fg">Giving by year</h3>
      <div className="flex items-end gap-3">
        {data.map((d) => {
          const barPx = max > 0 ? Math.max((d.total / max) * MAX_BAR_PX, 2) : 0;
          return (
            <div
              key={d.year}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${d.year}: ${formatCurrency(d.total)}`}
            >
              <span className="text-xs tabular-nums text-muted-fg">
                {formatCurrencyCompact(d.total)}
              </span>
              <div
                className="w-full max-w-16 rounded-t bg-primary"
                style={{ height: `${barPx}px` }}
              />
              <span className="text-xs text-muted-fg">{d.year}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

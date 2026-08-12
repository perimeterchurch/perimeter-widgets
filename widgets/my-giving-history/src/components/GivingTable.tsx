import * as React from 'react';
import type { GivingHistoryItem } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { downloadCsv, formatCurrency, formatGiftDate } from '../lib/format';
import { totalAmount } from '../lib/giving';

export function GivingTable({ items }: { items: GivingHistoryItem[] }): React.JSX.Element {
  const total = totalAmount(items);

  return (
    <section className="flex flex-col gap-3" aria-label="Giving history">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-fg">
          {items.length} gift{items.length === 1 ? '' : 's'} · {formatCurrency(total)} total
        </p>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(items)}>
          Download CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-fg">
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Donor</th>
              <th className="py-2 pr-4 font-medium">Program</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.distributionId} className="border-b border-border/50">
                <td className="py-2 pr-4 whitespace-nowrap">{formatGiftDate(item.date)}</td>
                <td className="py-2 pr-4">
                  {item.donorName}
                  {item.softCreditSource === null ? null : (
                    // Soft credit: the household is credited, but the money came
                    // from a fund, employer, or trust — name it.
                    <span className="block text-xs text-muted-fg">via {item.softCreditSource}</span>
                  )}
                </td>
                <td className="py-2 pr-4">{item.programName}</td>
                <td className="py-2 pr-4">{item.paymentType}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="py-2 pr-4" colSpan={4}>
                Total
              </td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

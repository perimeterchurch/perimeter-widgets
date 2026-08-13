import * as React from 'react';
import type { GivingHistoryItem } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { donorLabel, downloadCsv, formatCurrency, formatGiftDate } from '../lib/format';
import { totalAmount } from '../lib/giving';

export function GivingTable({ items }: { items: GivingHistoryItem[] }): React.JSX.Element {
  const total = totalAmount(items);

  // `min-w-0` on the section AND on the table's scroller below is load-bearing.
  // Each is an item of a shrink-refusing parent — the section is a grid item of
  // app.tsx's `grid`, the scroller a flex item of the section — and both default
  // to `min-width: auto`, which sizes to content. Foundation names are long and
  // set `whitespace-nowrap` to keep row heights even, so without both the table
  // widens the entire widget past its host on a narrow screen rather than
  // scrolling inside the wrapper.
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Giving history">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-fg">
          {items.length} gift{items.length === 1 ? '' : 's'} · {formatCurrency(total)} total
        </p>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(items)}>
          Download CSV
        </Button>
      </div>
      <div className="min-w-0 overflow-x-auto">
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
                {/*
                  A soft-credited gift is listed under the organization that sent
                  it — donors know these as "Foundation checks" and scan this
                  column for the foundation's name, as the legacy widget listed
                  them. The member the gift is credited to stays on the row
                  beneath, so the row still says whose giving it is (which
                  matters for an IRA distribution, where the custodian is only
                  the conduit and the member is the donor).
                */}
                <td className="py-2 pr-4">
                  <span className="whitespace-nowrap">{donorLabel(item)}</span>
                  {item.softCreditSource === null ? null : (
                    <span className="block text-xs whitespace-nowrap text-muted-fg">
                      credited to {item.donorName}
                    </span>
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

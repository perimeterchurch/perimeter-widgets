import * as React from 'react';
import { Download } from 'lucide-react';
import type { MyMissionDonation } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { formatAddressLine, formatCurrency, formatDate, dialDigits } from '../lib/format';
import { donationsFilename, donationsToCsv, downloadCsv } from '../lib/csv';
import { sortDonations } from '../lib/trips';

function DonorAddress({ donation }: { donation: MyMissionDonation }): React.JSX.Element {
  if (donation.anonymous || donation.address === null) return <></>;

  const line = formatAddressLine(donation.address);
  return (
    <>
      {donation.address.line1}
      {donation.address.line1 !== null && line !== '' && <br />}
      {line}
    </>
  );
}

const CELL = 'border border-border px-2 py-2 text-center align-top text-sm';

/**
 * Everyone who has given toward this participant's pledge, newest first, with
 * a CSV export for writing thank-you notes.
 *
 * Anonymous gifts arrive from the server with the donor's identity already
 * stripped — the legacy widget received the real name and contact details and
 * merely chose not to render them, so anyone could read them out of the network
 * response.
 */
export function DonationsSection({
  donations,
}: {
  donations: readonly MyMissionDonation[];
}): React.JSX.Element {
  const sorted = React.useMemo(() => sortDonations(donations), [donations]);

  return (
    <section className="grid gap-4">
      {/* Six columns of contact detail don't fit a phone; the table keeps its
          natural width and scrolls inside this container so the page itself
          never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse border border-border">
          <caption className="sr-only">Donations toward this trip</caption>
          <thead>
            <tr>
              {['Date', 'Amount', 'Name', 'Email', 'Phone', 'Address'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="border border-border bg-muted px-2 py-2 text-center text-sm font-semibold text-fg"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((donation, index) => (
              <tr
                key={`${donation.date}-${donation.donorName}-${index}`}
                className="even:bg-muted/40"
              >
                <td className={CELL}>{formatDate(donation.date)}</td>
                <td className={`${CELL} whitespace-nowrap pr-4 text-right`}>
                  {formatCurrency(donation.amount)}
                </td>
                <td className={CELL}>{donation.donorName}</td>
                <td className={`${CELL} min-w-[200px] whitespace-nowrap`}>
                  {donation.email !== null && (
                    <a href={`mailto:${donation.email}`} className="text-primary hover:underline">
                      {donation.email}
                    </a>
                  )}
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  {donation.phone !== null && (
                    <a
                      href={`sms:${dialDigits(donation.phone)}`}
                      className="text-primary hover:underline"
                    >
                      {donation.phone}
                    </a>
                  )}
                </td>
                <td className={CELL}>
                  <DonorAddress donation={donation} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="primary"
        className="ml-auto"
        onClick={() => downloadCsv(donationsFilename(), donationsToCsv(sorted))}
      >
        <Download aria-hidden className="mr-2 size-4" />
        Download CSV
      </Button>
    </section>
  );
}

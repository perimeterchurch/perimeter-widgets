import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import type { PrayerRequest } from '@perimeter/api-hooks';
import { formatPrayerCount, formatSubmittedDate } from '../lib/format';

export interface PrayerCardProps {
  request: PrayerRequest;
  /** True once this browser has prayed for it — shows the count, not the button. */
  prayed: boolean;
  /** The count to show after praying, which the server returns. */
  prayedCount: number | undefined;
  pending: boolean;
  onPray: (id: number) => void;
}

/**
 * One request: who and when, the request itself, and either the "I Prayed"
 * button or the running count once this browser has pressed it.
 */
export function PrayerCard({
  request,
  prayed,
  prayedCount,
  pending,
  onPray,
}: PrayerCardProps): React.JSX.Element {
  const submitted = formatSubmittedDate(request.submittedAt);

  return (
    <li className="border border-border p-6 @md:p-8">
      <p className="font-sans text-base font-bold text-muted-fg">
        {submitted ? `${submitted} by ${request.submittedBy}` : `By ${request.submittedBy}`}
      </p>
      {/* whitespace-pre-line: submitters lay requests out in short lines and
          blank-line paragraphs, and MP stores exactly what they typed. */}
      <p className="mt-2 mb-5 font-sans text-lg leading-relaxed whitespace-pre-line text-muted-fg">
        {request.request}
      </p>
      {prayed ? (
        <p className="font-sans text-base text-fg">
          {formatPrayerCount(prayedCount ?? request.prayerCount)}
        </p>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full @sm:w-auto @sm:min-w-96"
          disabled={pending}
          onClick={() => onPray(request.id)}
        >
          {pending ? (
            <>
              <Spinner className="mr-2" />
              Recording…
            </>
          ) : (
            'I Prayed'
          )}
        </Button>
      )}
    </li>
  );
}

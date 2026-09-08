import * as React from 'react';
import type { MyMissionTrip } from '@perimeter/api-hooks';
import { formatCurrency, formatDateRange } from '../lib/format';
import { ProgressBar } from './ProgressBar';

/** The Leaders strip — each leader's photo and name, linking to their email. */
function Leaders({ leaders }: { leaders: MyMissionTrip['leaders'] }): React.JSX.Element {
  return (
    <div className="grid gap-2">
      <h5 className="text-base font-semibold text-fg">Leaders</h5>
      <ul className="flex flex-wrap gap-3">
        {leaders.map((leader, index) => {
          const body = (
            <>
              {leader.photoUrl === null ? (
                <span aria-hidden className="size-12 shrink-0 rounded-full bg-muted" />
              ) : (
                <img
                  src={leader.photoUrl}
                  alt=""
                  loading="lazy"
                  className="size-12 shrink-0 rounded-full bg-muted object-cover"
                />
              )}
              <span className="truncate pr-3 text-sm">{leader.name}</span>
            </>
          );

          return (
            <li key={`${leader.email ?? leader.name}-${index}`}>
              {leader.email === null ? (
                <span className="flex items-center gap-2 rounded-4xl border border-border bg-muted py-0.5 pl-0.5 text-fg">
                  {body}
                </span>
              ) : (
                <a
                  href={`mailto:${leader.email}`}
                  className="flex items-center gap-2 rounded-4xl border border-border bg-muted py-0.5 pl-0.5 text-fg no-underline transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The always-visible head of an expanded trip: dates, the participant's own
 * funding progress, and the trip's leaders.
 */
export function StatusSection({ trip }: { trip: MyMissionTrip }): React.JSX.Element {
  return (
    <section className="grid gap-2 pb-2">
      <p className="text-muted-fg">{formatDateRange(trip.startDate, trip.endDate)}</p>

      <ProgressBar
        raised={trip.totalDonations}
        goal={trip.totalPledge}
        label={`Funds raised toward ${trip.name}`}
      />

      <p className="text-fg">
        {trip.mine ? 'My funds raised: ' : `${trip.participantName}'s funds raised: `}
        <span className="font-semibold">{formatCurrency(trip.totalDonations)}</span>
        {` of ${formatCurrency(trip.totalPledge)}`}
      </p>

      {trip.leaders.length > 0 && <Leaders leaders={trip.leaders} />}
    </section>
  );
}

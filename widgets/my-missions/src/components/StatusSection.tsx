import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import type { MyMissionTrip } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { formatCurrency, formatDateRange, leaderPhotoUrl } from '../lib/format';
import { ProgressBar } from './ProgressBar';

interface LeadersProps {
  leaders: MyMissionTrip['leaders'];
  campaignId: number;
  apiUrl: string | undefined;
}

/**
 * The Leaders strip — each leader's photo and name, linking to their email.
 *
 * The photo comes from the public participant-photo route, composed from the
 * leader's pledge ID. It 404s for a leader with no photo on file, which is
 * common, so the `<img>` sits on a muted circle that shows through when the
 * request fails rather than rendering a broken-image icon.
 */
function Leaders({ leaders, campaignId, apiUrl }: LeadersProps): React.JSX.Element {
  return (
    <div className="grid gap-2">
      <h5 className="text-base font-semibold text-fg">Leaders</h5>
      <ul className="flex flex-wrap gap-3">
        {leaders.map((leader) => {
          const body = (
            <>
              <img
                src={leaderPhotoUrl(campaignId, leader.pledgeId, apiUrl)}
                alt=""
                loading="lazy"
                className="size-12 shrink-0 rounded-full bg-muted object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
              <span className="truncate pr-3 text-sm">{leader.name}</span>
            </>
          );

          return (
            <li key={leader.pledgeId}>
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

export interface StatusSectionProps {
  trip: MyMissionTrip;
  /** The `apiUrl` config override, for composing leader photo URLs. */
  apiUrl: string | undefined;
  /** Base URL for the "Trip Page" link on current trips (campaign ID appended). */
  tripPageUrlBase: string;
}

/**
 * The always-visible head of an expanded trip: dates, the participant's own
 * funding progress, and the trip's leaders.
 */
export function StatusSection({
  trip,
  apiUrl,
  tripPageUrlBase,
}: StatusSectionProps): React.JSX.Element {
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

      {/* Jump to the public GO Journey page for this trip. Only for current
          trips — a past trip's campaign page is typically taken down, so the
          link would 404. `tripPageUrlBase` is empty when the embed turned the
          link off. Opens a new tab so the member keeps their place in their
          own trip list. */}
      {!trip.past && tripPageUrlBase !== '' && (
        <Button
          variant="outline"
          nativeButton={false}
          className="w-fit"
          render={
            <a
              href={`${tripPageUrlBase}${trip.campaignId}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <ExternalLink aria-hidden className="mr-2 size-4" />
          Trip Page
        </Button>
      )}

      {trip.leaders.length > 0 && (
        <Leaders leaders={trip.leaders} campaignId={trip.campaignId} apiUrl={apiUrl} />
      )}
    </section>
  );
}

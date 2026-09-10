import * as React from 'react';
import type { MyMissionTrip } from '@perimeter/api-hooks';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusSection } from './StatusSection';
import { RichText } from './RichText';
import { DonationsSection } from './DonationsSection';
import { LeaderSection } from './LeaderSection';
import { LetterSection } from './LetterSection';

export interface TripPanelProps {
  trip: MyMissionTrip;
  /** The `apiUrl` config override, for composing leader photo URLs. */
  apiUrl: string | undefined;
  /** Base URL for the "Trip Page" link on current trips (campaign ID appended). */
  tripPageUrlBase: string;
}

/**
 * The body of one expanded trip: the always-visible status head, then the
 * disclosures that apply to this trip. Section order and the conditions for
 * showing each one follow the legacy widget — leader resources first (they are
 * the reason a leader opens the trip at all), then description, donations, and
 * the letter.
 */
export function TripPanel({ trip, apiUrl, tripPageUrlBase }: TripPanelProps): React.JSX.Element {
  const hasDescription = trip.longDescription !== null && trip.longDescription.trim().length > 0;

  return (
    <div className="grid gap-4">
      <StatusSection trip={trip} apiUrl={apiUrl} tripPageUrlBase={tripPageUrlBase} />

      {trip.leaderSummary !== null && (
        <CollapsibleSection title="Trip Leader Resources">
          <LeaderSection summary={trip.leaderSummary} participants={trip.participants} />
        </CollapsibleSection>
      )}

      {hasDescription && (
        <CollapsibleSection title="Description">
          <RichText html={trip.longDescription} />
        </CollapsibleSection>
      )}

      {trip.donations.length > 0 && (
        <CollapsibleSection
          title="Donations"
          meta={
            <span className="text-sm font-normal text-muted-fg">({trip.donations.length})</span>
          }
        >
          <DonationsSection donations={trip.donations} />
        </CollapsibleSection>
      )}

      {/* A finished trip's letter is history — the legacy widget hid the editor
          on past trips, and the server sends no letter for them. */}
      {!trip.past && (
        <CollapsibleSection title="My Letter">
          <LetterSection pledgeId={trip.pledgeId} letter={trip.letter} />
        </CollapsibleSection>
      )}
    </div>
  );
}

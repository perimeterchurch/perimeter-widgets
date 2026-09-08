import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import type { MyMissionTrip } from '@perimeter/api-hooks';
import { formatDateRange } from '../lib/format';
import { tripLabel } from '../lib/trips';
import { TripPanel } from './TripPanel';

export interface TripsAccordionProps {
  trips: readonly MyMissionTrip[];
  /** The `apiUrl` config override, for composing leader photo URLs. */
  apiUrl: string | undefined;
}

/**
 * The trip list — one row per pledge, at most one expanded at a time (the
 * legacy single-`expandedIndex` behaviour).
 *
 * A panel is mounted only while its row is open. That is deliberate rather than
 * incidental: an expanded trip carries a donations table and a ProseMirror
 * editor, and a household with several trips would otherwise instantiate one
 * editor per trip on first render.
 */
export function TripsAccordion({ trips, apiUrl }: TripsAccordionProps): React.JSX.Element {
  const [openPledgeId, setOpenPledgeId] = React.useState<number | null>(null);
  const idPrefix = React.useId();

  return (
    <div className="grid gap-2">
      {trips.map((trip) => {
        const open = openPledgeId === trip.pledgeId;
        const panelId = `${idPrefix}-${trip.pledgeId}`;

        return (
          <div key={trip.pledgeId} className="overflow-hidden rounded-md border border-border">
            <h4>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenPledgeId(open ? null : trip.pledgeId)}
                className="flex w-full items-center justify-between gap-3 bg-muted px-4 py-4 text-left transition-colors hover:bg-accent hover:text-accent-fg focus-visible:bg-accent focus-visible:text-accent-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-lg font-semibold">{tripLabel(trip)}</span>
                  <span className="text-sm font-normal opacity-80">
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`size-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
              </button>
            </h4>
            {open && (
              <div id={panelId} className="p-4">
                <TripPanel trip={trip} apiUrl={apiUrl} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

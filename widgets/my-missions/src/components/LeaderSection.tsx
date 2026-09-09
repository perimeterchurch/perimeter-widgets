import * as React from 'react';
import { Mail } from 'lucide-react';
import type { MyMissionLeaderSummary, MyMissionParticipant } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { formatCurrency } from '../lib/format';
import { participantsMailto, sortParticipants } from '../lib/trips';
import { ProgressBar } from './ProgressBar';

function ParticipantTable({
  participants,
}: {
  participants: readonly MyMissionParticipant[];
}): React.JSX.Element {
  const sorted = React.useMemo(() => sortParticipants(participants), [participants]);

  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">Participant funding</caption>
      <thead>
        <tr>
          <th scope="col" className="border-b border-border px-2 py-2 text-left font-semibold">
            Participant
          </th>
          <th scope="col" className="border-b border-border px-2 py-2 text-left font-semibold">
            Funding
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((participant) => (
          <tr key={participant.pledgeId}>
            <td className="border-b border-border px-2 py-2 align-top">{participant.name}</td>
            <td className="border-b border-border px-2 py-2">
              <div className="grid gap-1">
                <div className="text-sm">
                  {'Funds raised: '}
                  <span className="font-semibold">
                    {formatCurrency(participant.totalDonations)}
                  </span>
                  {` of ${formatCurrency(participant.totalPledge)}`}
                </div>
                <ProgressBar
                  raised={participant.totalDonations}
                  goal={participant.totalPledge}
                  label={`Funds raised by ${participant.name}`}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface LeaderSectionProps {
  summary: MyMissionLeaderSummary;
  participants: readonly MyMissionParticipant[];
}

/**
 * Trip Leader Resources — whole-trip funding plus every participant's
 * progress, and a one-click `mailto:` to the whole roster.
 *
 * Only rendered when the server says the viewer leads this trip
 * (`leaderSummary !== null`).
 */
export function LeaderSection({ summary, participants }: LeaderSectionProps): React.JSX.Element {
  return (
    <section className="grid gap-4">
      <Button
        variant="primary"
        nativeButton={false}
        // text-white is a deliberate stakeholder choice, not an oversight: it
        // overrides the primary variant's `text-primary-fg` (brand navy) with
        // pure white. White on the light `bg-primary` sky-blue is below the
        // WCAG AA contrast the rest of the widget holds — kept on request.
        className="w-fit text-white"
        render={<a href={participantsMailto(summary.email, participants)} />}
      >
        <Mail aria-hidden className="mr-2 size-4" />
        Email All Participants
      </Button>

      <div className="grid gap-2">
        <div>
          {'Total funds raised: '}
          <span className="font-semibold">{formatCurrency(summary.totalDonations)}</span>
          {` of ${formatCurrency(summary.totalGoal)}`}
        </div>
        <ProgressBar
          raised={summary.totalDonations}
          goal={summary.totalGoal}
          label="Total funds raised for this trip"
        />
      </div>

      {participants.length > 0 && <ParticipantTable participants={participants} />}
    </section>
  );
}

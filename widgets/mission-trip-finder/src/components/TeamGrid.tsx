import * as React from 'react';
import type { MissionTripParticipant } from '@perimeter/api-hooks';
import { cn } from '@perimeter/ui/utils/cn';
import type { MissionTripFinderConfig } from '../types';
import { fillUrlTemplate, participantPhotoUrl } from '../lib/format';
import { PersonIcon } from './icons';

/**
 * One team member's avatar. The photo endpoint 404s for anyone with no photo on
 * file — which is most people — so a failed load is the expected path, not an
 * error, and it falls back to a person glyph.
 *
 * Deliberately NOT opacity-faded on load, unlike TripBanner: a roster renders
 * every avatar at once, and per-element opacity transitions on a large grid are
 * the exact shape that strands elements at `opacity: 0`. The container fades;
 * the avatars do not.
 */
function Avatar({ src, alt }: { src: string; alt: string }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);

  return (
    <div className="aspect-square w-full overflow-hidden rounded-full bg-muted">
      {failed ? (
        <div className="flex h-full w-full items-center justify-center text-muted-fg">
          <PersonIcon className="h-1/2 w-1/2 opacity-40" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function TeamGrid({
  tripId,
  participants,
  config,
}: {
  tripId: number;
  participants: MissionTripParticipant[];
  config: MissionTripFinderConfig;
}): React.JSX.Element | null {
  if (participants.length === 0) return null;

  return (
    <section>
      <h3 className="mb-4 font-sans text-xl font-bold">Meet the Team</h3>
      <ul className="grid grid-cols-3 gap-4 @md:grid-cols-4 @2xl:grid-cols-6">
        {participants.map((person) => {
          const avatar = (
            <>
              <Avatar
                src={participantPhotoUrl(tripId, person.pledgeId, config.apiUrl)}
                alt={person.name}
              />
              <span className="mt-2 block text-center font-sans text-sm leading-snug">
                {person.name}
              </span>
            </>
          );

          return (
            <li key={person.pledgeId}>
              {/* The legacy template wrapped these in href="insert link" — a
                  placeholder that was never wired up. Unset by default, so a
                  team card is plain content unless the embed points it
                  somewhere. */}
              {config.participantUrl ? (
                <a
                  href={fillUrlTemplate(config.participantUrl, {
                    id: tripId,
                    pledgeId: person.pledgeId,
                  })}
                  className={cn(
                    'block text-fg no-underline',
                    'hover:[&_span]:underline focus-visible:[&_span]:underline',
                  )}
                >
                  {avatar}
                </a>
              ) : (
                avatar
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

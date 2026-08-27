import * as React from 'react';
import type { MissionTripParticipant } from '@perimeter/api-hooks';
import type { MissionTripFinderConfig } from '../types';
import { fillUrlTemplate, participantPhotoUrl } from '../lib/format';
import { PhotoFallback } from './PhotoFallback';

/**
 * Square portrait with the name across the bottom. The photo sits under a dark
 * scrim that lifts on hover — the legacy page's treatment, and it does real
 * work: it holds the white name legible over portraits shot on every
 * conceivable background.
 *
 * The scrim is a sibling overlay rather than a filter/opacity on the <img>
 * itself. Fading ~20 images each on their own opacity transition is the shape
 * that strands them invisible; animating a solid overlay's opacity is cheap and
 * leaves the photo's own compositing alone.
 */
function TeamPhoto({ src, name }: { src: string; name: string }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);

  return (
    <div className="group relative aspect-square w-full overflow-hidden bg-neutral-800">
      {failed ? (
        <PhotoFallback />
      ) : (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="block h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}

      <div
        className="absolute inset-0 bg-black/45 transition-colors duration-300 group-hover:bg-black/0"
        aria-hidden="true"
      />

      <span className="absolute inset-x-0 bottom-0 px-2 pb-5 text-center font-sans text-sm leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {name}
      </span>
    </div>
  );
}

/**
 * Sized-and-wrapped rather than a strict grid: a final row with one or two
 * people centres under the row above it instead of hanging off the left edge,
 * which is what a `grid-cols-*` track would do.
 */
const CARD = 'w-[calc(50%-0.3125rem)] @sm:w-[150px] @xl:w-[190px]';

export function TeamGrid({
  tripId,
  participants,
  config,
  className,
  onSelect,
}: {
  tripId: number;
  participants: MissionTripParticipant[];
  config: MissionTripFinderConfig;
  className?: string | undefined;
  /** Open this person's page in place. Omitted when `participantUrl` links out. */
  onSelect?: ((pledgeId: number) => void) | undefined;
}): React.JSX.Element | null {
  if (participants.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="mb-6 text-center font-sans text-3xl leading-tight font-medium text-balance @md:text-4xl @xl:text-5xl">
        Meet the Team
      </h3>
      <ul className="flex flex-wrap justify-center gap-2.5">
        {participants.map((person) => {
          const photo = (
            <TeamPhoto
              src={participantPhotoUrl(tripId, person.pledgeId, config.apiUrl)}
              name={person.name}
            />
          );

          return (
            <li key={person.pledgeId} className={CARD}>
              {/* An anchor when the embed hands off to a separate participant
                  page, a button when the page opens in place — the same split
                  the trip cards make, so keyboard and screen-reader semantics
                  match what the click actually does. */}
              {config.participantUrl ? (
                <a
                  href={fillUrlTemplate(config.participantUrl, {
                    id: tripId,
                    pledgeId: person.pledgeId,
                  })}
                  className="block no-underline"
                >
                  {photo}
                </a>
              ) : onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(person.pledgeId)}
                  className="block w-full cursor-pointer text-left"
                  aria-label={`View ${person.name}'s page`}
                >
                  {photo}
                </button>
              ) : (
                photo
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

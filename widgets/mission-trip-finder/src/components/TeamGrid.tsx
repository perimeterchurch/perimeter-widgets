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

      <span className="absolute inset-x-0 bottom-0 px-2 pb-5 text-center font-sans text-sm leading-snug text-white">
        {name}
      </span>
    </div>
  );
}

/**
 * Three to a row — the roster reads as a block rather than a ragged wall,
 * because every card is the same size and every row is the same length.
 *
 * Still sized-and-wrapped rather than a `grid-cols-3` track: a final row with
 * one or two people centres under the row above it, where a real grid would
 * hang it off the left edge. An 11-person roster ends on a row of two, so that
 * is the common case, not the exception.
 *
 * Widths are percentages of the row minus that row's share of the 0.625rem gap
 * (`gap-2.5`): two gaps across three cards is 0.41667rem each. Two columns
 * below `@sm` — three squares plus names in a 360px column is unreadable.
 */
const CARD = 'w-[calc(50%-0.3125rem)] @sm:w-[calc(33.333%-0.41667rem)]';

/**
 * The roster is capped narrower than the band it sits in.
 *
 * Card size is derived from this width, not set on the card — capping the card
 * instead would let a fourth and fifth card wrap onto the row, since flex-wrap
 * fits as many as the line allows. At 32rem the three columns land at 164px
 * each; left to the band's own `max-w-4xl` they reach ~292px on a full-width
 * page, which is larger than a roster of headshots wants to be.
 */
const ROSTER = 'mx-auto w-full max-w-lg';

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
      <h3 className="mb-6 text-center font-serif text-3xl leading-tight font-normal text-balance @md:text-4xl @xl:text-5xl">
        Meet the Team
      </h3>
      <ul className={`${ROSTER} flex flex-wrap justify-center gap-2.5`}>
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

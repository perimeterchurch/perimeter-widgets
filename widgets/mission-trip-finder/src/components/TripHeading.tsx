import * as React from 'react';
import { Badge } from '@perimeter/ui/badge';
import { SECTION_Y } from './Section';

/**
 * The trip's name, destination and travel dates on white — the Figma's opening
 * band. This replaced a full-bleed darkened cover photo; the photography moved
 * down into the gallery scroller, which gave the title real contrast (brand
 * navy on white rather than white over an arbitrary staff-chosen photo) and
 * removed the scrim the old hero needed to stay legible.
 */
export function TripHeading({
  name,
  destination,
  dates,
  registrationFull,
  invitationOnly,
}: {
  name: string;
  destination: string | null;
  dates: string | null;
  registrationFull: boolean;
  invitationOnly: boolean;
}): React.JSX.Element {
  return (
    <header className={`${SECTION_Y} flex flex-col items-center gap-3 px-6 text-center`}>
      <h2 className="max-w-2xl font-serif text-4xl leading-[1.1] font-medium text-balance text-fg @md:text-5xl @xl:text-6xl">
        {name}
      </h2>

      {destination && (
        <p className="font-sans text-2xl font-bold text-muted-fg @md:text-3xl">{destination}</p>
      )}

      {dates && <p className="font-sans text-lg font-bold tracking-wide text-muted-fg">{dates}</p>}

      {(registrationFull || invitationOnly) && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {registrationFull && <Badge variant="warning">Registration Full</Badge>}
          {invitationOnly && <Badge variant="secondary">Invitation Only</Badge>}
        </div>
      )}
    </header>
  );
}

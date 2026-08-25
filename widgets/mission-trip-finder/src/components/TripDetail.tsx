import * as React from 'react';
import { useMissionTrip } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import type { MissionTripFinderConfig } from '../types';
import { fillUrlTemplate, formatCost, formatTripDatesLong, spotsRemaining } from '../lib/format';
import { TripHero } from './TripHero';
import { TripFact, ICON } from './TripFact';
import { TeamGrid } from './TeamGrid';
import { ArrowLeftIcon, CheckIcon, LinkIcon, MoneyIcon, PersonIcon } from './icons';

interface TripDetailProps {
  id: number;
  config: MissionTripFinderConfig;
  onBack: () => void;
  /** False when the embed is pinned to one trip — there is no list to go back to. */
  showBack: boolean;
}

/** The detail's readable column. The hero deliberately escapes it. */
const COLUMN = 'mx-auto w-full max-w-3xl px-6';

export function TripDetail({ id, config, onBack, showBack }: TripDetailProps): React.JSX.Element {
  const { data, isLoading, error } = useMissionTrip(id);
  const trip = data?.data;
  const safeBody = useSafeHtml(trip?.longDescription);
  const { copied, flash } = useCopiedFlash(2000);
  const headingRef = React.useRef<HTMLDivElement>(null);

  // The open trip is already in the URL via nuqs (trip-screen=detail&trip-id=…),
  // so the current href is the shareable deep link.
  const handleCopyLink = () => {
    void navigator.clipboard?.writeText(window.location.href);
    flash();
  };

  React.useEffect(() => {
    if (trip) headingRef.current?.focus();
  }, [trip]);

  // Sits above the hero rather than floating on it: these are widget chrome,
  // not part of the page the legacy design reproduces.
  const toolbar = (
    <div className="flex items-center justify-between gap-3 p-4">
      {showBack ? (
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button variant="ghost" size="sm" onClick={handleCopyLink} className="gap-2">
        {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
    </div>
  );

  if (error) {
    return (
      <div>
        {toolbar}
        <div className={COLUMN}>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Trip not found</EmptyTitle>
              <EmptyDescription>
                This mission trip may have ended or is no longer published.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  const spotsLeft = trip && spotsRemaining(trip.registrantCount, trip.maximumRegistrants);
  // Registering for a trip that is full or invitation-only is a dead end, so
  // the button is dropped rather than shown and rejected on the far side.
  const showRegister = !!trip && !trip.registrationFull && !trip.invitationOnly;

  return (
    <div>
      {toolbar}
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div>
            <Skeleton className="h-[340px] w-full rounded-none @md:h-[440px] @xl:h-[520px]" />
            <div className={`${COLUMN} space-y-4 py-12`}>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
        }
      >
        {trip && (
          <div ref={headingRef} tabIndex={-1} className="outline-hidden">
            <TripHero
              src={trip.bannerUrl}
              fallbackSrc={config.defaultImageUrl}
              name={trip.name}
              destination={trip.destination}
              dates={formatTripDatesLong(trip.startDate, trip.endDate)}
            />

            <div className={`${COLUMN} space-y-10 py-12`}>
              {(trip.registrationFull || trip.invitationOnly) && (
                <div className="flex flex-wrap justify-center gap-2">
                  {trip.registrationFull && <Badge variant="warning">Registration Full</Badge>}
                  {trip.invitationOnly && <Badge variant="secondary">Invitation Only</Badge>}
                </div>
              )}

              {/* Long_Description is authored in Ministry Platform's rich-text
                  editor, so it arrives as HTML and is sanitized by useSafeHtml.
                  `description` (plain text) is the card teaser and is not
                  repeated here. */}
              {trip.longDescription && (
                <div
                  className="text-base leading-loose [&_a]:underline [&_p]:mb-5 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={safeBody}
                />
              )}

              {(config.showCost || config.showSpots) && (
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                  {config.showCost && trip.cost !== null && (
                    <TripFact icon={<MoneyIcon className={ICON} />}>
                      {formatCost(trip.cost)} per participant
                    </TripFact>
                  )}
                  {config.showSpots && spotsLeft !== null && !trip.registrationFull && (
                    <TripFact icon={<PersonIcon className={ICON} />}>
                      {spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`}
                    </TripFact>
                  )}
                </div>
              )}

              {(showRegister || config.supportUrl) && (
                <div className="flex flex-wrap justify-center gap-3">
                  {showRegister && config.registerUrl && (
                    <Button
                      size="lg"
                      render={<a href={fillUrlTemplate(config.registerUrl, { id: trip.id })} />}
                    >
                      Register to Join
                    </Button>
                  )}
                  {config.supportUrl && (
                    <Button
                      size="lg"
                      variant="outline"
                      render={<a href={fillUrlTemplate(config.supportUrl, { id: trip.id })} />}
                    >
                      Support Journey
                    </Button>
                  )}
                </div>
              )}

              {config.showTeam && (
                <TeamGrid tripId={trip.id} participants={trip.participants} config={config} />
              )}

              {config.disclaimerText && (
                <section>
                  <h3 className="mb-3 font-sans text-sm font-bold tracking-wide uppercase">
                    Donation Disclaimer
                  </h3>
                  <p className="text-sm leading-loose text-muted-fg">{config.disclaimerText}</p>
                </section>
              )}
            </div>
          </div>
        )}
      </SkeletonTransition>
    </div>
  );
}

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
import { fillUrlTemplate, formatCost, formatTripDates, spotsRemaining } from '../lib/format';
import { TripBanner } from './TripBanner';
import { TripFact, ICON } from './TripFact';
import { TeamGrid } from './TeamGrid';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  LinkIcon,
  MoneyIcon,
  PersonIcon,
  PinIcon,
} from './icons';

interface TripDetailProps {
  id: number;
  config: MissionTripFinderConfig;
  onBack: () => void;
  /** False when the embed is pinned to one trip — there is no list to go back to. */
  showBack: boolean;
}

export function TripDetail({ id, config, onBack, showBack }: TripDetailProps): React.JSX.Element {
  const { data, isLoading, error } = useMissionTrip(id);
  const trip = data?.data;
  const safeBody = useSafeHtml(trip?.longDescription);
  const { copied, flash } = useCopiedFlash(2000);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  // The open trip is already in the URL via nuqs (trip-screen=detail&trip-id=…),
  // so the current href is the shareable deep link.
  const handleCopyLink = () => {
    void navigator.clipboard?.writeText(window.location.href);
    flash();
  };

  React.useEffect(() => {
    if (trip) titleRef.current?.focus();
  }, [trip]);

  const back = showBack && (
    <Button variant="outline" size="sm" onClick={onBack} className="mb-4 gap-2">
      <ArrowLeftIcon className="h-4 w-4" /> Back
    </Button>
  );

  if (error) {
    return (
      <div>
        {back}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Trip not found</EmptyTitle>
            <EmptyDescription>
              This mission trip may have ended or is no longer published.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const dates = trip && formatTripDates(trip.startDate, trip.endDate);
  const spotsLeft = trip && spotsRemaining(trip.registrantCount, trip.maximumRegistrants);
  // Registering for a trip that is full or invitation-only is a dead end, so
  // the button is dropped rather than shown and rejected on the far side.
  const showRegister = !!trip && !trip.registrationFull && !trip.invitationOnly;

  return (
    <div>
      {back}
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-none" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        {trip && (
          <div className="space-y-6">
            <TripBanner
              src={trip.bannerUrl}
              fallbackSrc={config.defaultImageUrl}
              alt={trip.destination ?? trip.name}
            />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h2
                  ref={titleRef}
                  tabIndex={-1}
                  className="font-sans text-2xl leading-tight font-bold text-balance outline-hidden"
                >
                  {trip.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-2"
                >
                  {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>

              {(trip.registrationFull || trip.invitationOnly) && (
                <div className="flex flex-wrap gap-2">
                  {trip.registrationFull && <Badge variant="warning">Registration Full</Badge>}
                  {trip.invitationOnly && <Badge variant="secondary">Invitation Only</Badge>}
                </div>
              )}

              <div className="space-y-2">
                {trip.destination && (
                  <TripFact icon={<PinIcon className={ICON} />}>{trip.destination}</TripFact>
                )}
                {dates && <TripFact icon={<CalendarIcon className={ICON} />}>{dates}</TripFact>}
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
            </div>

            {/* Long_Description is authored in Ministry Platform's rich-text
                editor, so it arrives as HTML and is sanitized by useSafeHtml.
                `description` (plain text) is the card teaser and is not
                repeated here. */}
            {trip.longDescription && (
              <div
                className="space-y-3 text-base leading-relaxed [&_a]:underline [&_p]:mb-3 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={safeBody}
              />
            )}

            {(showRegister || config.supportUrl) && (
              <div className="flex flex-wrap gap-3">
                {showRegister && config.registerUrl && (
                  <Button
                    render={<a href={fillUrlTemplate(config.registerUrl, { id: trip.id })} />}
                  >
                    Register to Join
                  </Button>
                )}
                {config.supportUrl && (
                  <Button
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
              <section className="bg-muted p-4">
                <h3 className="mb-2 font-sans text-sm font-bold tracking-wide uppercase">
                  Donation Disclaimer
                </h3>
                <p className="text-sm leading-relaxed text-muted-fg">{config.disclaimerText}</p>
              </section>
            )}
          </div>
        )}
      </SkeletonTransition>
    </div>
  );
}

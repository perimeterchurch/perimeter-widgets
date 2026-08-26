import * as React from 'react';
import { useMissionTrip } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import type { MissionTripFinderConfig } from '../types';
import { fillUrlTemplate, formatTripDatesLong, splitList, spotsRemaining } from '../lib/format';
import { TESTIMONIALS } from '../lib/testimonials';
import { Section, SectionHeading, SECTION_Y, READING_COLUMN } from './Section';
import { TripHeading } from './TripHeading';
import { TripGallery } from './TripGallery';
import { Testimonials } from './Testimonials';
import { TripFact, ICON } from './TripFact';
import { TeamGrid } from './TeamGrid';
import { ArrowLeftIcon, CheckIcon, LinkIcon, PersonIcon } from './icons';

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

  // Widget chrome, above the page the design reproduces.
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
        <Section>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Trip not found</EmptyTitle>
              <EmptyDescription>
                This mission trip may have ended or is no longer published.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Section>
      </div>
    );
  }

  const spotsLeft = trip && spotsRemaining(trip.registrantCount, trip.maximumRegistrants);
  // Registering for a trip that is full or invitation-only is a dead end, so
  // the button is dropped rather than shown and rejected on the far side.
  const showRegister = !!trip && !trip.registrationFull && !trip.invitationOnly;

  // The destination banner is the fallback gallery: it is the one real photo
  // every trip has, and it is what the previous hero displayed.
  const configured = splitList(config.galleryUrls);
  const gallery = configured.length > 0 ? configured : trip?.bannerUrl ? [trip.bannerUrl] : [];

  return (
    <div>
      {toolbar}
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div>
            <div className={`${SECTION_Y} flex flex-col items-center gap-3 px-6`}>
              <Skeleton className="h-12 w-3/4 max-w-2xl" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex gap-4 px-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-square w-[260px] shrink-0 @md:w-[340px] @xl:w-[420px]"
                />
              ))}
            </div>
          </div>
        }
      >
        {trip && (
          <div ref={headingRef} tabIndex={-1} className="outline-hidden">
            <TripHeading
              name={trip.name}
              destination={trip.destination}
              dates={formatTripDatesLong(trip.startDate, trip.endDate)}
              registrationFull={trip.registrationFull}
              invitationOnly={trip.invitationOnly}
            />

            <TripGallery images={gallery} alt={trip.name} fullBleed={config.fullBleed} />

            <Section className="gap-12">
              <SectionHeading>About the Journey</SectionHeading>

              {/* Long_Description is authored in Ministry Platform's rich-text
                  editor, so it arrives as HTML and is sanitized by useSafeHtml.
                  `description` (plain text) is the card teaser and is not
                  repeated here. */}
              {trip.longDescription && (
                <div
                  className={`${READING_COLUMN} font-sans text-lg leading-[1.9] [&_a]:underline [&_p]:mb-8 [&_p:last-child]:mb-0`}
                  dangerouslySetInnerHTML={safeBody}
                />
              )}

              {config.showSpots && spotsLeft !== null && !trip.registrationFull && (
                <TripFact icon={<PersonIcon className={ICON} />}>
                  {spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`}
                </TripFact>
              )}

              {(showRegister || config.supportUrl) && (
                <div className="flex flex-wrap justify-center gap-8">
                  {showRegister && config.registerUrl && (
                    <Button
                      size="lg"
                      className="w-[200px] text-xl font-bold"
                      render={<a href={fillUrlTemplate(config.registerUrl, { id: trip.id })} />}
                    >
                      Register to Join
                    </Button>
                  )}
                  {config.supportUrl && (
                    <Button
                      size="lg"
                      className="w-[200px] text-xl font-bold"
                      render={<a href={fillUrlTemplate(config.supportUrl, { id: trip.id })} />}
                    >
                      Support Journey
                    </Button>
                  )}
                </div>
              )}
            </Section>

            {config.showTestimonials && (
              <Testimonials testimonials={TESTIMONIALS} fullBleed={config.fullBleed} />
            )}

            {/* TeamGrid brings its own "Meet the Team" heading and card
                treatment, both deliberately left as they were — the Figma
                restyles the bands around it, not the roster. */}
            {config.showTeam && (
              <Section>
                <TeamGrid tripId={trip.id} participants={trip.participants} config={config} />
              </Section>
            )}

            {config.disclaimerText && (
              <section className="px-6 pb-16 @md:pb-24 @xl:pb-30">
                <div className={READING_COLUMN}>
                  <h3 className="mb-3 font-sans text-sm font-bold tracking-wide uppercase">
                    Donation Disclaimer
                  </h3>
                  <p className="font-sans text-sm leading-loose text-muted-fg">
                    {config.disclaimerText}
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </SkeletonTransition>
    </div>
  );
}

import * as React from 'react';
import { useMissionTripParticipant } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';
import type { MissionTripFinderConfig } from '../types';
import { fillUrlTemplate, formatCost, participantPhotoUrl } from '../lib/format';
import { Section, READING_COLUMN } from './Section';
import { ArrowLeftIcon } from './icons';
import { PhotoFallback } from './PhotoFallback';

/**
 * Money raised against the participant's goal.
 *
 * `<progress>` rather than a pair of divs: it is announced correctly by screen
 * readers with its value and maximum, which a decorative bar is not. Its
 * appearance is reset so the fill can be the brand accent.
 */
function RaisedBar({ raised, goal }: { raised: number; goal: number }): React.JSX.Element {
  const pct = Math.min(100, Math.round((raised / goal) * 100));

  return (
    <div className={`${READING_COLUMN} flex flex-col gap-2`}>
      <progress
        value={raised}
        max={goal}
        aria-label={`${formatCost(raised)} raised of a ${formatCost(goal)} goal`}
        className="h-4 w-full appearance-none border border-primary [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-bg [&::-webkit-progress-value]:bg-primary"
      >
        {pct}%
      </progress>
      <div className="flex justify-between font-sans text-sm font-bold">
        <span>Raised: {formatCost(raised)}</span>
        <span>Goal: {formatCost(goal)}</span>
      </div>
    </div>
  );
}

function Portrait({ src, name }: { src: string; name: string }): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);

  return (
    <div className="size-40 overflow-hidden rounded-full bg-muted @md:size-52">
      {failed ? (
        <PhotoFallback />
      ) : (
        <img
          src={src}
          alt={name}
          className="block h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/**
 * The GO Journey Participant view: one person's photo, fundraising progress and
 * support letter, sitting under the trip's heading and photo scroller.
 *
 * Replaces the legacy `/go-journey-participant/?pledge=<id>` page. That page's
 * progress bar never actually worked — its template read a dataset its stored
 * proc did not return — and it pulled the letter from `Journey_Members`, which
 * holds no rows for any current trip. Both come from live fields here.
 */
export function ParticipantDetail({
  tripId,
  pledgeId,
  config,
  onBackToTrip,
}: {
  tripId: number;
  pledgeId: number;
  config: MissionTripFinderConfig;
  onBackToTrip: () => void;
}): React.JSX.Element {
  const { data, isLoading, error } = useMissionTripParticipant(tripId, pledgeId);
  const participant = data?.data;
  const safeLetter = useSafeHtml(participant?.letter);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (participant) headingRef.current?.focus();
  }, [participant]);

  const backButton = (
    <Button variant="outline" size="lg" onClick={onBackToTrip} className="gap-2">
      <ArrowLeftIcon className="h-4 w-4" /> View Trip Details
    </Button>
  );

  if (error) {
    return (
      <Section>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Participant not found</EmptyTitle>
            <EmptyDescription>This person may no longer be part of this trip.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        {backButton}
      </Section>
    );
  }

  return (
    <Section>
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div className="flex w-full flex-col items-center gap-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="size-40 rounded-full @md:size-52" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        }
      >
        {participant && (
          <div className="flex w-full flex-col items-center gap-8">
            <p className="font-sans text-sm font-bold tracking-widest text-primary uppercase">
              GO Journey Participant
            </p>

            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-center font-serif text-3xl leading-tight font-bold text-balance outline-hidden @md:text-4xl @xl:text-5xl"
            >
              {participant.name}
            </h3>

            <Portrait
              src={participantPhotoUrl(tripId, pledgeId, config.apiUrl)}
              name={participant.name}
            />

            {/* No goal means no meaningful bar — an uncapped campaign has no
                target to measure against, so the figures are omitted rather
                than shown as a full or empty bar. */}
            {participant.goal !== null && participant.goal > 0 && (
              <RaisedBar raised={participant.raised} goal={participant.goal} />
            )}

            {config.participantSupportUrl && (
              <Button
                size="lg"
                className="whitespace-nowrap"
                render={
                  <a
                    href={fillUrlTemplate(config.participantSupportUrl, {
                      id: tripId,
                      pledgeId,
                    })}
                  />
                }
              >
                Support {participant.firstName ?? participant.name}
              </Button>
            )}

            {/* Pledges.Letter is written in Ministry Platform's rich-text
                editor, so it arrives as HTML and is sanitized. Most
                participants have not written one. */}
            {participant.letter && (
              <div
                className={`${READING_COLUMN} font-sans text-base leading-[1.9] [&_a]:underline [&_p]:mb-[1.9em] [&_p:last-child]:mb-0`}
                dangerouslySetInnerHTML={safeLetter}
              />
            )}

            {backButton}
          </div>
        )}
      </SkeletonTransition>
    </Section>
  );
}

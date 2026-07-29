import * as React from 'react';
import type { CommunityGroup } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { cn } from '@perimeter/ui/utils/cn';
import type { CommunityGroupFinderConfig } from '../types';
import {
  formatLocation,
  formatMeetingSchedule,
  formatStartDate,
  groupImageUrl,
  isUpcoming,
  truncate,
} from '../lib/format';

const IMAGE_BOX = 'w-full overflow-hidden aspect-video bg-muted';

/**
 * The group's neighborhood banner, with a loading skeleton and a graceful
 * fallback when the image endpoint 404s (the group has no image in MP). Mirrors
 * the FallbackImage pattern in the event-finder and mission-trip-finder widgets,
 * minus their placeholder icon — this widget carries no decorative icons, so an
 * imageless group gets a plain muted band.
 */
function GroupBanner({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc?: string | undefined;
  alt: string;
}): React.JSX.Element {
  const [loaded, setLoaded] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [failed, setFailed] = React.useState(false);
  const triedFallback = React.useRef(false);

  // On error, try the configured default image once before giving up. Each card
  // is keyed by group id, so this state resets per group without needing to sync
  // against the `src` prop.
  const handleError = () => {
    if (fallbackSrc && !triedFallback.current && currentSrc !== fallbackSrc) {
      triedFallback.current = true;
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return <div className={IMAGE_BOX} aria-hidden="true" />;
  }

  return (
    <div className={cn('relative', IMAGE_BOX)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        className={cn(
          'block h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}

/**
 * One metadata line on the card — city, schedule, start date. Plain text; the
 * finder uses no leading icons.
 *
 * Bold on the muted gray token, which gives the card three distinct registers
 * without a fourth color: the title is bold + `fg`, the description is regular
 * + `fg`, and metadata is bold + `muted-fg`. Bold is what keeps the lighter gray
 * readable — `muted-fg` clears AA in both themes, and the weight carries it the
 * rest of the way at 14px.
 */
function GroupFact({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="font-sans text-sm font-bold text-muted-fg">{children}</p>;
}

export function GroupCard({
  group,
  config,
}: {
  group: CommunityGroup;
  config: CommunityGroupFinderConfig;
}): React.JSX.Element {
  const location = formatLocation(group.city, group.state);
  const schedule = formatMeetingSchedule(
    group.meetingDay,
    group.meetingTime,
    group.meetingFrequency,
  );
  // Long-running groups carry a Start_Date from years ago; only a group that has
  // not begun yet has a start date worth printing.
  const startDate = isUpcoming(group.startDate) ? formatStartDate(group.startDate) : null;

  return (
    <li className="relative flex flex-col overflow-hidden rounded-none border border-border bg-bg text-fg">
      {config.showImages && (
        <GroupBanner
          src={groupImageUrl(group.id, config.apiUrl)}
          fallbackSrc={config.defaultImageUrl}
          alt={group.neighborhood ?? group.name}
        />
      )}

      {/* The one deliberately round thing on an otherwise square card: a status
          pill reads as a pill, and squaring it made it look like a button. */}
      {group.isFull && (
        <div className="absolute top-2 right-2">
          <Badge variant="warning">Group Is Full</Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-sans text-lg leading-snug font-bold text-balance">{group.name}</h3>

        {location && <GroupFact>{location}</GroupFact>}
        {schedule && <GroupFact>{schedule}</GroupFact>}
        {startDate && <GroupFact>Starts: {startDate}</GroupFact>}

        {config.showDescription && group.description && (
          <p className="mt-2 font-sans text-sm leading-relaxed whitespace-pre-line">
            {truncate(group.description, config.descriptionLimit)}
          </p>
        )}

        <div className="mt-auto flex justify-end pt-4">
          {/*
            White label in light mode to match perimeter.org's own buttons.
            This overrides the theme's `primary-fg` (brand navy), which is the
            token paired with `primary` precisely because white on the light
            brand blue measures ~2.1:1 — see the note in the widget doc. Dark
            mode keeps navy, where nothing on the page expects white.
          */}
          <Button
            size="sm"
            nativeButton={false}
            className="rounded-none text-white dark:text-primary-fg"
            render={<a href={`${config.detailsUrlBase}${group.id}`} />}
          >
            {config.detailsLabel}
          </Button>
        </div>
      </div>
    </li>
  );
}

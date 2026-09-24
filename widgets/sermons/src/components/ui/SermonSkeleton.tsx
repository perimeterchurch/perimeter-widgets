import { Skeleton } from '@perimeter/ui/skeleton';
import type { ViewMode } from '../../types';

/**
 * viewMode-aware loading skeleton for the sermon/series results region.
 *
 * The skeleton's container + item shape mirror the LOADED view (SermonGrid /
 * SermonList / SeriesGrid) so the results region keeps the same shape when the
 * query resolves — no layout jump on load.
 *
 * - grid → the @[…] container-query 1/2/3-col grid of square bordered cards;
 *          each item is an aspect-video media block + two text lines.
 * - list → vertical stack of wide horizontal cards (w-56 aspect-video media +
 *          text column), matching SermonList / SeriesGrid list.
 */
export function SermonSkeleton({ viewMode, count }: { viewMode: ViewMode; count: number }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-4" data-slot="sermon-skeleton">
        {items.map((i) => (
          <div
            key={i}
            className="flex w-full flex-row overflow-hidden border border-border"
            data-slot="sermon-skeleton-item"
          >
            <Skeleton className="aspect-video w-32 shrink-0 rounded-none @[30rem]:w-56" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <Skeleton className="h-4 w-3/4 rounded-sm" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
              <Skeleton className="h-3 w-2/3 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className="grid grid-cols-1 gap-6 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3"
      data-slot="sermon-skeleton"
    >
      {items.map((i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden border border-border"
          data-slot="sermon-skeleton-item"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-4 w-3/4 rounded-sm" />
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

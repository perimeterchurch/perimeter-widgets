import { Skeleton } from '@perimeter/ui/skeleton';
import type { ViewMode } from '../../types';

/**
 * viewMode-aware loading skeleton for the sermon/series results region.
 *
 * The skeleton's container + item shape mirror the LOADED view (SermonGrid /
 * SermonSmallList / SermonLargeList / SeriesGrid) so the results region keeps
 * the same shape when the query resolves — no layout jump on load. Previously
 * both views hardcoded a single `h-48` grid skeleton regardless of `viewMode`,
 * which jumped in list/large.
 *
 * - grid  → the @[…] container-query 1/2/3-col grid; each item is an
 *           aspect-video media block + two text lines (≈ the grid card).
 * - list  → stacked thin rows (10×10 thumb + two short lines), divided like
 *           the small list.
 * - large → vertical stack of wide horizontal rows (w-56 aspect-video media +
 *           text column), matching SermonLargeList / SeriesGrid large.
 */
export function SermonSkeleton({ viewMode, count }: { viewMode: ViewMode; count: number }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="divide-y divide-border" data-slot="sermon-skeleton">
        {items.map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-1 py-2"
            data-slot="sermon-skeleton-item"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-sm" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5 rounded-sm" />
              <Skeleton className="h-3 w-2/5 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'large') {
    return (
      <div className="space-y-4" data-slot="sermon-skeleton">
        {items.map((i) => (
          <div
            key={i}
            className="flex w-full flex-row overflow-hidden rounded-xl ring-1 ring-fg/10"
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
      className="grid grid-cols-1 gap-4 @[30rem]:grid-cols-2 @[48rem]:grid-cols-3"
      data-slot="sermon-skeleton"
    >
      {items.map((i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl ring-1 ring-fg/10"
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

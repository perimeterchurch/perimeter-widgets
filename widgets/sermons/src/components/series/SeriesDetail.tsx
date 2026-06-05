import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { useSeriesDetail } from '@perimeter/api-hooks';
import type { SermonsConfig } from '../../types';
import { formatDate } from '../../lib/format';

interface SeriesDetailProps {
  id: number;
  config: SermonsConfig;
  onBack: () => void;
  onSermonClick: (id: number) => void;
}

export function SeriesDetail({ id, onBack, onSermonClick }: SeriesDetailProps) {
  const { data, isLoading, error } = useSeriesDetail(id);
  const series = data?.data;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (series) titleRef.current?.focus();
  }, [series]);

  if (error) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Series not found</EmptyTitle>
            <EmptyDescription>
              This series may have been removed or is unavailable.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <SkeletonTransition
        isLoading={isLoading}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        }
      >
        {series && (
          <div className="space-y-4">
            <div>
              <h2 ref={titleRef} tabIndex={-1} className="text-xl font-bold text-fg outline-none">
                {series.displayTitle ?? series.title}
              </h2>
              {series.subtitle && <p className="text-sm text-muted-fg mt-1">{series.subtitle}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-muted-fg">
                  {series.sermonCount} sermon{series.sermonCount !== 1 ? 's' : ''}
                </span>
                {series.book && <Badge variant="secondary">{series.book.name}</Badge>}
              </div>
            </div>

            <div className="divide-y divide-border">
              {series.sermons.map((sermon, index) => (
                <button
                  key={sermon.id}
                  type="button"
                  onClick={() => onSermonClick(sermon.id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1"
                >
                  <span className="flex-shrink-0 w-6 text-center text-xs font-medium text-muted-fg">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm text-fg">{sermon.title}</p>
                    <p className="text-xs text-muted-fg">
                      {sermon.speaker.name} · {formatDate(sermon.date)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </SkeletonTransition>
    </div>
  );
}

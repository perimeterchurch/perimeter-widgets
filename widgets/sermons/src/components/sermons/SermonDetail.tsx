import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Type, Link2, Check } from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@perimeter/ui/empty';
import { Skeleton } from '@perimeter/ui/skeleton';
import { SortSelect } from '@perimeter/ui/sort-select';
import { SkeletonTransition } from '@perimeter/ui/skeleton-transition';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import { useSermonDetail, useSermons } from '@perimeter/api-hooks';
import type { SermonsConfig, SortField, SortOrder } from '../../types';
import { formatDate, sermonImageUrl } from '../../lib/format';
import { defined } from '../../lib/query-params';
import { MediaTabs } from '../players/MediaTabs';
import { MediaCard } from '../ui/MediaCard';
import { DateLabel, SeriesPill, SpeakerLabel, BookLabel } from './SermonInfo';

interface SermonDetailProps {
  id: number;
  config: SermonsConfig;
  onBack: () => void;
  onSermonClick?: ((id: number) => void) | undefined;
}

const SORT_FIELDS = [
  {
    value: 'date',
    label: 'Date',
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  {
    value: 'title',
    label: 'Title',
    icon: <Type className="h-3.5 w-3.5" />,
  },
];

export function SermonDetail({ id, config, onBack, onSermonClick }: SermonDetailProps) {
  const { data, isLoading, error } = useSermonDetail(id);
  const sermon = data?.data;
  const safeDescription = useSafeHtml(sermon?.description);
  const showRelated = (config.display ?? 'full') !== 'headless';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');
  const { copied, flash } = useCopiedFlash(2000);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // The selected sermon is already encoded in the URL via nuqs (screen=detail,
  // id=…), so the current href is a shareable deep link. Copy it to the
  // clipboard and flash a confirmation.
  const handleCopyLink = () => {
    void navigator.clipboard?.writeText(window.location.href);
    flash();
  };

  useEffect(() => {
    if (sermon) titleRef.current?.focus();
  }, [sermon]);

  // Gated on the parent fetch: while the sermon is in flight, seriesId would
  // be dropped and the hook would fire an unfiltered 50-row listing that is
  // thrown away as soon as the real seriesId arrives. The config's pinned
  // seriesTypeId keeps the related list consistent with the browse view.
  const { data: seriesData, error: relatedError } = useSermons(
    defined({
      seriesId: sermon?.series.id ? String(sermon.series.id) : undefined,
      seriesTypeId: config.seriesTypeId || undefined,
      // Sermons sort only over date/title; 'count' is series-only.
      sort: sortField === 'count' ? 'date' : sortField,
      order: sortDirection,
      perPage: 50,
    }),
    { enabled: !!sermon?.series.id },
  );

  const relatedSermons = (seriesData?.data.sermons ?? []).filter((s) => s.id !== id);

  if (error) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sermon not found</EmptyTitle>
            <EmptyDescription>
              This sermon may have been removed or is unavailable.
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
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        {sermon && (
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-xl font-bold text-fg outline-hidden"
                >
                  {sermon.title}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  aria-label="Copy link to this sermon"
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <p className="text-sm text-muted-fg mt-1">
                {sermon.speaker.name} · {formatDate(sermon.date)} · {sermon.series.title}
              </p>
              {sermon.scriptureLinks && (
                <p className="text-xs text-muted-fg mt-1">Scripture: {sermon.scriptureLinks}</p>
              )}
            </div>
            <MediaTabs links={sermon.links} />
            {sermon.description && (
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-semibold text-sm mb-2">About this sermon</h3>
                <div
                  className="text-sm text-muted-fg [&_a]:text-primary [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={safeDescription}
                />
              </div>
            )}

            {/* Related fetch failed: a quiet inline note, not a full error
                block — the sermon itself loaded fine. */}
            {showRelated && relatedError && (
              <p data-slot="related-error" className="text-sm text-muted-fg">
                Couldn&rsquo;t load more sermons from this series.
              </p>
            )}

            {/* More from this series */}
            {showRelated && !relatedError && relatedSermons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">More from this series</h3>
                  <SortSelect
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortFieldChange={(f: string) => setSortField(f as SortField)}
                    onSortDirectionChange={(d: SortOrder) => setSortDirection(d)}
                    fields={SORT_FIELDS}
                  />
                </div>
                <div className="divide-y divide-border">
                  {relatedSermons.map((s) => (
                    <MediaCard
                      key={s.id}
                      viewMode="list"
                      imageUrl={s.bannerUrl ?? sermonImageUrl(s.id, config.apiUrl)}
                      imageAlt={s.title}
                      title={s.title}
                      description={s.shortDescription}
                      topLeft={<DateLabel date={formatDate(s.date)} />}
                      topRight={<SeriesPill name={s.series.title} />}
                      bottomLeft={<SpeakerLabel name={s.speaker.name} />}
                      bottomRight={s.book?.name ? <BookLabel name={s.book.name} /> : undefined}
                      onClick={() => onSermonClick?.(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SkeletonTransition>
    </div>
  );
}

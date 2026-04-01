import { Badge } from '@perimeter-widgets/shared';
import type { SeriesListItem } from '../../types';
import { formatDate, seriesImageUrl } from '../../lib/format';
import { MediaCard } from '../ui/MediaCard';

interface SeriesGridProps {
    series: SeriesListItem[];
    viewMode?: 'grid' | 'list' | 'large';
    onSeriesClick: (id: number) => void;
}

function SeriesMeta({ series }: { series: SeriesListItem }) {
    return (
        <span className='text-xs text-muted-foreground'>
            {series.sermonCount} sermon{series.sermonCount !== 1 ? 's' : ''}
            {series.latestSermonDate
                && ` · ${formatDate(series.latestSermonDate)}`}
        </span>
    );
}

export function SeriesGrid({
    series,
    viewMode = 'grid',
    onSeriesClick,
}: SeriesGridProps) {
    if (series.length === 0) {
        return (
            <div className='py-12 text-center text-muted-foreground'>
                No series found.
            </div>
        );
    }

    const wrapperClass =
        viewMode === 'list' ? 'divide-y divide-border'
        : viewMode === 'large' ? 'space-y-4'
        : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

    return (
        <div className={wrapperClass}>
            {series.map((s) => (
                <MediaCard
                    key={s.id}
                    viewMode={viewMode}
                    imageUrl={seriesImageUrl(s.id)}
                    imageAlt={s.displayTitle ?? s.title}
                    title={s.displayTitle ?? s.title}
                    subtitle={s.subtitle}
                    meta={<SeriesMeta series={s} />}
                    badges={
                        s.book ?
                            <Badge variant='secondary'>{s.book.name}</Badge>
                        :   undefined
                    }
                    onClick={() => onSeriesClick(s.id)}
                />
            ))}
        </div>
    );
}

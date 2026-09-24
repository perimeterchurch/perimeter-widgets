import type { SermonListItem, SermonListViewProps } from '../../types';
import { formatDate } from '../../lib/format';

/**
 * A card meta value that filters the list to it (a series or a speaker). Drawn
 * in the brand blue #60bbe9 to match perimeter.org's own links — a deliberate
 * choice, knowing it's 2.15:1 on white (below WCAG AA's 4.5:1). `data-slot`
 * lets the studio axe sweep exempt exactly these nodes from color-contrast.
 */
export function FilterLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-slot="brand-link"
      onClick={onClick}
      className="max-w-full cursor-pointer truncate text-left text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {label}
    </button>
  );
}

/**
 * The card meta for one sermon (grid, large list, detail header). The series
 * and speaker are links that filter the list when their handler is given,
 * plain text otherwise.
 */
export function sermonCardMeta(
  sermon: Pick<SermonListItem, 'date' | 'series' | 'speaker' | 'book'>,
  { onSeriesClick, onSpeakerClick }: Pick<SermonListViewProps, 'onSeriesClick' | 'onSpeakerClick'>,
) {
  const { series, speaker, book } = sermon;
  return {
    topLeft: formatDate(sermon.date),
    topRight: onSeriesClick ? (
      <FilterLink label={series.title} onClick={() => onSeriesClick(series.id, series.title)} />
    ) : (
      series.title
    ),
    bottomLeft: onSpeakerClick ? (
      <FilterLink label={speaker.name} onClick={() => onSpeakerClick(speaker.id, speaker.name)} />
    ) : (
      speaker.name
    ),
    bottomRight: book?.name ? `Book: ${book.name}` : undefined,
  };
}

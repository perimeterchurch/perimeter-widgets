import { FileSearch, TriangleAlert, RotateCw, X } from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@perimeter/ui/empty';

interface ResultsErrorProps {
  /** Plural noun for the resource, e.g. "sermons" or "series". */
  noun: string;
  onRetry: () => void;
}

/**
 * Themed error block for a failed results query — visually distinct from the
 * empty state (alert icon, retry action) so an API outage doesn't read as
 * "no results". Both views drop straight into this when `error` is set.
 */
export function ResultsError({ noun, onRetry }: ResultsErrorProps) {
  return (
    <Empty data-slot="results-error">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Couldn&rsquo;t load {noun}</EmptyTitle>
        <EmptyDescription>
          Something went wrong reaching the server. Please try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </EmptyContent>
    </Empty>
  );
}

interface ResultsEmptyProps {
  /** Plural noun for the resource, e.g. "sermons" or "series". */
  noun: string;
  /** Whether filters are active, so we offer a "Clear filters" CTA. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

/**
 * Themed empty state for a successful query with zero results. When filters are
 * active it offers a "Clear filters" CTA so the user isn't stranded.
 */
export function ResultsEmpty({ noun, hasActiveFilters, onClearFilters }: ResultsEmptyProps) {
  return (
    <Empty data-slot="results-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileSearch />
        </EmptyMedia>
        <EmptyTitle>No {noun} found</EmptyTitle>
        <EmptyDescription>
          {hasActiveFilters
            ? 'No results match the current filters.'
            : `There are no ${noun} to show yet.`}
        </EmptyDescription>
      </EmptyHeader>
      {hasActiveFilters && onClearFilters && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

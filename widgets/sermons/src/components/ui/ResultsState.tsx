import { FileSearch, TriangleAlert, LockKeyhole, RotateCw, X } from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import { ApiError } from '@perimeter/api-hooks';
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
  /** The query error, used to distinguish an expired session (401) from an outage. */
  error?: unknown;
}

/**
 * Themed error block for a failed results query — visually distinct from the
 * empty state (alert icon, retry action) so an API outage doesn't read as
 * "no results". Both views drop straight into this when `error` is set.
 *
 * A 401 (expired/rejected MP token) is shown as a session-ended state rather
 * than a generic outage: the user must sign in again on the host page, so the
 * copy guides that and Retry re-runs the query once they have (the auth
 * provider picks up the refreshed token from localStorage).
 */
export function ResultsError({ noun, onRetry, error }: ResultsErrorProps) {
  const isAuthError = error instanceof ApiError && error.isAuthError;

  return (
    <Empty data-slot="results-error">
      <EmptyHeader>
        <EmptyMedia variant="icon">{isAuthError ? <LockKeyhole /> : <TriangleAlert />}</EmptyMedia>
        <EmptyTitle>{isAuthError ? 'Session expired' : `Couldn’t load ${noun}`}</EmptyTitle>
        <EmptyDescription>
          {isAuthError
            ? 'Your session has ended. Sign in again, then retry.'
            : 'Something went wrong reaching the server. Please try again.'}
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

import type { operations } from '../generated/operations';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@perimeter/widget-runtime';
import { fetchJson } from '../internal/fetch-json';

export type RecordPrayerResponse =
  operations['recordPrayerForRequest']['responses']['200']['content']['application/json'];

/**
 * Record that someone prayed for a request — the "I Prayed" button. Posts to
 * `POST /api/prayer-wall/requests/{id}/prayer` and resolves with the request's
 * new total, so the card can show the real count rather than adding one
 * optimistically.
 *
 * Deliberately does NOT invalidate the feed: refetching would re-render every
 * card on the page in response to one button press, and the only thing that
 * changed is a number the caller already has.
 */
export function useRecordPrayer(): UseMutationResult<RecordPrayerResponse, Error, number> {
  const client = useApiClient();
  return useMutation({
    mutationFn: (requestId: number) =>
      fetchJson<RecordPrayerResponse>(
        client,
        `/api/prayer-wall/requests/${requestId}/prayer`,
        'Prayer',
        { method: 'POST' },
      ),
  });
}

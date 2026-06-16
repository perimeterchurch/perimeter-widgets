/**
 * Sermons facet lists (speakers, books, series, series-/service-types) change
 * rarely — a new entry appears only when content is published. Cache them for
 * 5 minutes client-side so filtering, tab switches, and re-renders within a
 * session don't refetch (the QueryClient default is 30s). Mirrors the
 * perimeter-api edge cache's `s-maxage=300`, so a refetch after this window is
 * typically served instantly from the CDN rather than re-running the function.
 *
 * The sermon LIST and DETAIL hooks intentionally keep the shorter default —
 * they're the actual content and warrant fresher reads.
 */
export const FACET_STALE_TIME = 5 * 60_000;

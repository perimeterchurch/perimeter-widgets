/**
 * Small in-memory sermons API fixture for the visual harness. The studio dev base
 * is `localhost:5500` (perimeter-api), which is NOT running under Playwright — the
 * route mock in `helpers.ts` intercepts `**​/api/sermons**` and serves these shapes
 * so the widget renders real cards/series/facets without a backend.
 *
 * Shapes mirror `@perimeter/api-hooks` generated operations (listSermons /
 * listSeries / facet lists): `{ success, data: { sermons|series, pagination } }`
 * for the list endpoints, `{ success, data: [] }` for the facet endpoints.
 */

export const sermonsResponse = {
  success: true as const,
  data: {
    sermons: [
      {
        id: 101,
        title: 'The Weight of Glory',
        subtitle: null,
        shortDescription: 'A meditation on eternal things.',
        date: '2026-05-31',
        bannerUrl: null,
        speaker: { id: 1, name: 'Randy Pope' },
        series: { id: 10, title: 'Foundations' },
        congregation: { id: 1 },
        book: { id: 49, name: 'Ephesians' },
      },
      {
        id: 102,
        title: 'Grace Upon Grace',
        subtitle: null,
        shortDescription: 'On the abundance of the gospel.',
        date: '2026-05-24',
        bannerUrl: null,
        speaker: { id: 2, name: 'Jeff Norris' },
        series: { id: 10, title: 'Foundations' },
        congregation: { id: 1 },
        book: { id: 43, name: 'John' },
      },
      {
        id: 103,
        title: 'A Living Hope',
        subtitle: null,
        shortDescription: 'The resurrection and our future.',
        date: '2026-05-17',
        bannerUrl: null,
        speaker: { id: 1, name: 'Randy Pope' },
        series: { id: 11, title: 'First Peter' },
        congregation: { id: 1 },
        book: { id: 60, name: '1 Peter' },
      },
    ],
    pagination: { page: 1, perPage: 12, total: 3, totalPages: 1 },
  },
};

export const seriesResponse = {
  success: true as const,
  data: {
    series: [
      {
        id: 10,
        title: 'Foundations',
        displayTitle: null,
        subtitle: null,
        description: 'Core doctrines of the faith.',
        latestSermonDate: '2026-05-31',
        sermonCount: 8,
        book: null,
        seriesType: { id: 1, name: 'Sunday Morning' },
      },
      {
        id: 11,
        title: 'First Peter',
        displayTitle: null,
        subtitle: null,
        description: 'A walk through 1 Peter.',
        latestSermonDate: '2026-05-17',
        sermonCount: 5,
        book: { id: 60, name: '1 Peter' },
        seriesType: { id: 1, name: 'Sunday Morning' },
      },
    ],
    pagination: { page: 1, perPage: 12, total: 2, totalPages: 1 },
  },
};

/** Facet endpoints (speakers/books/service-types/series-types) return a bare data array. */
export const facetResponse = {
  success: true as const,
  data: [] as unknown[],
};

# Widget Analytics — Design Spec

> **Date:** 2026-03-18
> **Status:** Approved
> **Repos:** `perimeter-widgets` (tracking client), `perimeter-api` (endpoint, storage, dashboard)

## Overview

Lightweight, privacy-friendly analytics for tracking widget usage across perimeter.org. Each widget fires a single beacon on mount — no cookies, no session tracking, no personal data. Data is stored in Neon PostgreSQL and displayed in a dashboard page within perimeter-api.

## Architecture

```
perimeter.org (WordPress)
  └── Widget mounts
        └── navigator.sendBeacon() ─── fire-and-forget
                                            │
                                            ▼
                                   api.perimeter.org
                                   POST /api/analytics/events (public)
                                            │
                                            ▼
                                   NeonProvider (@neondatabase/serverless)
                                            │
                                            ▼
                                   Neon PostgreSQL (widget_events table)
                                            │
                                            ▼
                                   GET /api/analytics/stats (authenticated)
                                            │
                                            ▼
                                   Dashboard at /(protected)/analytics/
```

## Database Schema

Single table in Neon PostgreSQL:

```sql
CREATE TABLE widget_events (
    id            BIGSERIAL PRIMARY KEY,
    widget_id     TEXT NOT NULL,
    event_type    TEXT NOT NULL DEFAULT 'mount',
    page_url      TEXT NOT NULL,
    page_path     TEXT NOT NULL,
    hostname      TEXT NOT NULL,
    referrer      TEXT,
    user_agent    TEXT,
    device_type   TEXT,
    screen_width  INTEGER,
    config        JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_widget_events_created_at ON widget_events (created_at);
CREATE INDEX idx_widget_events_widget_id ON widget_events (widget_id);
CREATE INDEX idx_widget_events_page_path ON widget_events (page_path);
```

### Migration Strategy

Since this is the first Neon table in the project, the `CREATE TABLE` SQL is run manually via the Neon console or `psql` during setup. If more tables are added later, consider adopting a migration tool (Drizzle Kit or raw SQL scripts in a `migrations/` directory).

### Fields

| Field          | Source                  | Description                                                                                       |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `widget_id`    | Client payload          | Widget name (e.g., `'sermons'`) — extracted from `elementId` by stripping the `perimeter-` prefix |
| `event_type`   | Client payload          | `'mount'` for now, extensible for future interaction events                                       |
| `page_url`     | Client payload          | Full URL where widget is embedded                                                                 |
| `page_path`    | Client payload          | Path portion only (for grouping)                                                                  |
| `hostname`     | Client payload          | `'perimeter.org'`, `'localhost'`, etc.                                                            |
| `referrer`     | Client payload          | `document.referrer` or null                                                                       |
| `user_agent`   | Server (request header) | Raw UA string, more reliable than `navigator.userAgent`                                           |
| `device_type`  | Server (parsed from UA) | `'desktop'`, `'mobile'`, `'tablet'`                                                               |
| `screen_width` | Client payload          | Viewport width in pixels                                                                          |
| `config`       | Client payload          | Widget data-\* attributes as JSONB (capped at first 10 keys to prevent bloat)                     |
| `created_at`   | Server (DB default)     | Timestamp                                                                                         |

### Privacy

- No cookies or session IDs
- No IP addresses stored
- No personal data captured
- Config only contains widget configuration (campus, perPage, etc.)

### Data Volume

Estimated ~1,000-5,000 events/day for a church website. At 5K/day, the table reaches ~1.8M rows/year (~200MB). Neon free tier supports up to 3GB. A cleanup cron can be added when the table approaches capacity (out of scope for v1).

## Widget Tracking (perimeter-widgets)

### Location

New module in `@perimeter-widgets/shared`:

```
packages/shared/src/analytics/
    tracker.ts     — trackWidgetMount() function
```

### Tracking Function

```typescript
import { resolveBaseUrl } from '../api/client';

const tracked = new Set<string>();

export function trackWidgetMount(
    elementId: string,
    widgetId: string,
    config: Record<string, string | number | boolean>,
): void {
    // Skip in dev mode
    if (import.meta.env.DEV) return;

    // Deduplicate: one event per element ID per page load
    // (allows multiple instances of the same widget type on one page)
    if (tracked.has(elementId)) return;
    tracked.add(elementId);

    const payload = {
        widgetId,
        eventType: 'mount',
        pageUrl: window.location.href,
        pagePath: window.location.pathname,
        hostname: window.location.hostname,
        referrer: document.referrer || null,
        screenWidth: window.innerWidth,
        config,
    };

    const body = JSON.stringify(payload);
    const baseUrl = resolveBaseUrl();
    const url = `${baseUrl}/api/analytics/events`;

    // sendBeacon with text/plain avoids CORS preflight
    if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
    } else {
        fetch(url, {
            method: 'POST',
            body,
            keepalive: true,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}
```

**Note:** `resolveBaseUrl()` must be exported from `packages/shared/src/api/client.ts` (currently a private function — needs to be exported as part of this work).

### CORS Strategy

The beacon uses `Content-Type: text/plain` instead of `application/json`. This makes the request a "simple request" under CORS rules — no preflight needed. The server parses the body as JSON regardless of the content type header. This avoids any CORS configuration for the analytics endpoint.

### Integration with mountWidget()

Called automatically after a successful React render inside `mountWidget()`:

```typescript
// In mount.tsx, after root.render():
// Extract widget name from elementId (e.g., 'perimeter-sermons' → 'sermons')
const widgetId = elementId.replace(/^perimeter-/, '');
trackWidgetMount(elementId, widgetId, config);
```

No widget code changes needed — tracking is handled by the shared mount utility.

### Deduplication

A module-level `Set<string>` tracks which **element IDs** have already fired an event. This means:

- Re-mounts of the same element (HMR, config changes) do not fire duplicate events
- Two instances of the same widget type with different element IDs (e.g., two sermon widgets on one page) each fire their own event correctly

The set resets naturally on page navigation (full reload).

### Dev Filtering

`import.meta.env.DEV` check at the top of `trackWidgetMount()` — events are skipped entirely in development. No localhost data pollutes the analytics.

## perimeter-api: Neon Provider

### New Provider

Following the existing provider pattern (MPProvider, GraphProvider, SardiusProvider):

```
src/providers/neon/
    neon-provider.ts    — NeonProvider extending BaseProvider
    index.ts            — barrel export
```

### NeonProvider

Extends `BaseProvider` and follows the `getInstance()` / `initialize()` / `isReady()` singleton lifecycle pattern used by all other providers:

```typescript
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { BaseProvider } from '../base-provider';

export class NeonProvider extends BaseProvider {
    private static instance: NeonProvider | null = null;
    private sql: NeonQueryFunction | null = null;

    private constructor() {
        super('NeonProvider');
    }

    static getInstance(): NeonProvider {
        if (!NeonProvider.instance) {
            NeonProvider.instance = new NeonProvider();
        }
        return NeonProvider.instance;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        const connectionString = process.env.NEON_DATABASE_URL;
        if (!connectionString) {
            this.audit.warn(
                'NEON_DATABASE_URL not set — Neon provider disabled',
            );
            return;
        }

        this.sql = neon(connectionString);
        this.initialized = true;
        this.audit.info('Neon provider initialized');
    }

    async shutdown(): Promise<void> {
        this.sql = null;
        this.initialized = false;
    }

    async query<T>(text: string, params?: unknown[]): Promise<T[]> {
        if (!this.sql) throw new Error('NeonProvider not initialized');
        return this.sql(text, params) as Promise<T[]>;
    }

    async execute(text: string, params?: unknown[]): Promise<void> {
        if (!this.sql) throw new Error('NeonProvider not initialized');
        await this.sql(text, params);
    }
}
```

Uses `neon()` HTTP query function from `@neondatabase/serverless` — no connection pooling needed, each query is a stateless HTTP request. Ideal for Vercel serverless functions.

### Environment Variable

```
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

Added to perimeter-api's `.env.local` and Vercel environment variables.

### DI Registration

Registered in `src/lib/di/registrations/providers.ts` following the existing pattern:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
container.registerSingleton(NeonProvider as any, () => {
    const provider = NeonProvider.getInstance();
    if (!provider.isReady()) {
        provider.initialize();
    }
    return provider;
});
```

Full DI chain registered in the appropriate files:

- **Provider:** `src/lib/di/registrations/providers.ts` — NeonProvider (singleton)
- **System:** `src/lib/di/registrations/systems.ts` — AnalyticsSystem (singleton, receives NeonProvider)
- **Service:** `src/lib/di/registrations/services.ts` — AnalyticsService (factory, receives AnalyticsSystem)
- **Controller:** `src/lib/di/registrations/controllers.ts` — AnalyticsController (factory, receives AnalyticsService)

## perimeter-api: Analytics Domain

Following the 5-layer architecture:

```
src/app/api/(public)/analytics/events/route.ts      — POST (widget beacon)
src/app/api/(authenticated)/analytics/stats/route.ts — GET (dashboard queries)
src/controllers/analytics/analytics-controller.ts
src/services/analytics/analytics-service.ts
src/systems/neon/analytics/analytics-system.ts
src/data/models/analytics/index.ts                   — Zod schemas
```

### Zod Schemas

```typescript
// src/data/models/analytics/index.ts

import { z } from 'zod';

/** Validates the POST payload from widget sendBeacon */
export const WidgetEventCreateSchema = z.object({
    widgetId: z
        .string()
        .regex(/^[a-z][a-z0-9-]*$/)
        .max(50),
    eventType: z.enum(['mount']),
    pageUrl: z.string().url().max(2000),
    pagePath: z.string().max(500),
    hostname: z.string().max(253),
    referrer: z.string().url().max(2000).nullable(),
    screenWidth: z.number().int().min(0).max(10000),
    config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type WidgetEventCreate = z.infer<typeof WidgetEventCreateSchema>;

/** Validates the GET query params for the stats endpoint */
export const StatsQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    widgetId: z
        .string()
        .regex(/^[a-z][a-z0-9-]*$/)
        .max(50)
        .optional(),
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;
```

The `widgetId` regex (`/^[a-z][a-z0-9-]*$/`) prevents SQL injection by only allowing lowercase alphanumeric characters and hyphens.

### AnalyticsSystem

Extends `BaseSystem<NeonProvider, never>`. Uses `BaseSystem` for the provider reference and audit logging but does not use the caching infrastructure (analytics is write-heavy, stats queries can be cached at the service level if needed).

```typescript
export class AnalyticsSystem extends BaseSystem<NeonProvider, never> {
    constructor(provider: NeonProvider) {
        super(provider, 'AnalyticsSystem');
    }

    async insertEvent(
        event: WidgetEventCreate,
        userAgent: string,
    ): Promise<void> {
        const deviceType = parseDeviceType(userAgent);
        await this.provider.execute(
            `INSERT INTO widget_events (widget_id, event_type, page_url, page_path, hostname, referrer, user_agent, device_type, screen_width, config)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                event.widgetId,
                event.eventType,
                event.pageUrl,
                event.pagePath,
                event.hostname,
                event.referrer,
                userAgent,
                deviceType,
                event.screenWidth,
                event.config ? JSON.stringify(event.config) : null,
            ],
        );
    }

    async getStats(
        from: Date,
        to: Date,
        widgetId?: string,
    ): Promise<AnalyticsStats> {
        // Parameterized queries prevent SQL injection
        // ... GROUP BY aggregation queries ...
    }
}
```

All queries use parameterized `$1`, `$2`, etc. placeholders — the `widgetId` filter is always passed as a parameter, never interpolated into the query string.

### POST /api/analytics/events (Public)

- No authentication required (called by widgets on perimeter.org)
- Parses request body as JSON (regardless of Content-Type, since sendBeacon uses `text/plain`)
- Validates payload with `WidgetEventCreateSchema`
- Parses device type from `User-Agent` header
- Inserts row into `widget_events` via AnalyticsSystem
- Returns `204 No Content`

### Rate Limiting

Origin check: the route validates `req.headers.get('origin')` or `req.headers.get('referer')` contains `perimeter.org`. Requests from other origins are rejected with `403`. This prevents spam from arbitrary sources while allowing legitimate widget beacons. Localhost origins are also allowed for staging environments.

This is a simple, zero-cost protection. More sophisticated rate limiting (per-IP, per-minute) can be added via Vercel Edge Middleware if abuse is detected.

### Device Type Parsing

Simple regex-based parsing from the `User-Agent` header — checks tablet patterns first (iPad UA strings contain "Mobile"):

```typescript
function parseDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile/i.test(ua)) return 'mobile';
    return 'desktop';
}
```

### GET /api/analytics/stats (Authenticated)

Query parameters validated with `StatsQuerySchema`:

| Param      | Type     | Default     | Description         |
| ---------- | -------- | ----------- | ------------------- |
| `from`     | ISO date | 30 days ago | Start of date range |
| `to`       | ISO date | now         | End of date range   |
| `widgetId` | string   | all         | Filter by widget    |

Returns aggregated stats:

```json
{
    "success": true,
    "data": {
        "summary": {
            "totalLoads": 4521,
            "uniquePages": 12,
            "topWidget": "sermons"
        },
        "loadsByDay": [
            { "date": "2026-03-18", "count": 156 },
            { "date": "2026-03-17", "count": 142 }
        ],
        "topPages": [
            { "pagePath": "/sermons", "widgetId": "sermons", "count": 2100 },
            { "pagePath": "/", "widgetId": "sermons", "count": 1200 }
        ],
        "widgetBreakdown": [{ "widgetId": "sermons", "count": 4521 }],
        "deviceBreakdown": [
            { "deviceType": "desktop", "count": 2800 },
            { "deviceType": "mobile", "count": 1500 },
            { "deviceType": "tablet", "count": 221 }
        ],
        "topReferrers": [
            { "referrer": "https://google.com", "count": 800 },
            { "referrer": null, "count": 3000 }
        ]
    }
}
```

All queries are simple `GROUP BY` aggregations with parameterized date range and widgetId filters.

## Dashboard Page

### Location

```
src/app/(protected)/analytics/page.tsx
```

Protected by the existing AuthWrapper + role check (same as helpdesk, status pages).

### Layout

**Top row:** Summary cards

- Total loads (with period comparison)
- Unique pages
- Top widget

**Middle row:** Charts

- Loads over time (line chart, grouped by day)
- Device breakdown (donut chart)

**Bottom row:** Tables

- Top pages (path, widget, load count)
- Top referrers (source, count)
- Widget breakdown (widget name, count)

### Data Fetching

Uses the same React Query + apiClient pattern as existing dashboard pages:

```typescript
export const analyticsKeys = {
    all: ['analytics'] as const,
    stats: (params: StatsParams) =>
        [...analyticsKeys.all, 'stats', params] as const,
};
```

### Charts

Use **Recharts** (~45KB gzipped) for the line chart and donut chart. It's the most widely used React charting library with a simple declarative API. Commit to this choice to avoid ambiguity during implementation.

## Scope Boundaries

### In scope (this spec)

- `trackWidgetMount()` in shared package
- Export `resolveBaseUrl()` from API client
- Integration with `mountWidget()`
- NeonProvider extending BaseProvider for perimeter-api
- Full DI chain (provider, system, service, controller)
- Zod schemas for event creation and stats queries
- Analytics event ingestion endpoint with origin check
- Analytics stats query endpoint with parameterized queries
- Dashboard page with Recharts charts
- `widget_events` table schema, indexes, and migration SQL

### Out of scope (future)

- Interaction events (clicks, searches, video plays)
- Session tracking
- Real-time streaming (SSE)
- Data retention/cleanup (can add a cron job later)
- A/B testing or feature flags
- Export/download functionality

## Environment Variables

### perimeter-api

```
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### perimeter-widgets

No new environment variables. The analytics endpoint URL uses the existing `resolveBaseUrl()` which reads `VITE_API_URL` or falls back to `api.perimeter.org` in production. In dev mode, tracking is skipped entirely.

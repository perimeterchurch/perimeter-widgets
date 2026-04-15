# API Security & Auth Improvements

> **Date:** 2026-04-08
> **Scope:** perimeter-api (CORS + rate limiting) and perimeter-widgets (token validation + expiry detection)
> **Repos:** Two independent chunks — changes do not interact

---

## Context

A cross-project audit identified 4 remaining issues after the widgets hardening work. These split into two independent chunks: API-side security (CORS headers, rate limiting) and widget-side auth improvements (token validation, proactive expiry detection).

## Issues Addressed

| #   | Issue                                             | Repo              | Severity |
| --- | ------------------------------------------------- | ----------------- | -------- |
| 3   | Missing CORS headers for `/api/sermons/*`         | perimeter-api     | High     |
| 7   | No rate limiting on public sermons endpoints      | perimeter-api     | Medium   |
| 5   | Weak token validation (arbitrary 10-char minimum) | perimeter-widgets | Medium   |
| 4   | No proactive token expiry detection               | perimeter-widgets | Medium   |

---

## Chunk A: perimeter-api — CORS & Rate Limiting

### A1. CORS Headers for Sermons

**File:** `next.config.mjs`

Add a new entry to the existing `headers` array, following the same pattern as `/mp/events/:path*`:

```javascript
{
    source: '/api/sermons/:path*',
    headers: [
        {
            key: 'Access-Control-Allow-Origin',
            value:
                process.env.NODE_ENV === 'production' ?
                    'https://www.perimeter.org'
                :   '*',
        },
        {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
        },
        {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
        },
    ],
},
```

Only `GET` method — sermons endpoints are read-only. Production restricts to `perimeter.org`; development allows all origins.

### A2. Rate Limiting on Sermons Endpoints

Apply `withRateLimit(RateLimitPresets.relaxed)` (120 req/min per client IP) to all 10 public sermons route files. The rate limiter already exists in `src/lib/rate-limiting/` and is used by helpdesk endpoints.

**Route files to update (all under `src/app/api/(public)/sermons/`):**

| Route                               | File                         |
| ----------------------------------- | ---------------------------- |
| `GET /api/sermons`                  | `route.ts`                   |
| `GET /api/sermons/books`            | `books/route.ts`             |
| `GET /api/sermons/series`           | `series/route.ts`            |
| `GET /api/sermons/series/:id`       | `series/[id]/route.ts`       |
| `GET /api/sermons/series/:id/image` | `series/[id]/image/route.ts` |
| `GET /api/sermons/series-types`     | `series-types/route.ts`      |
| `GET /api/sermons/speakers`         | `speakers/route.ts`          |
| `GET /api/sermons/sermon/:id`       | `sermon/[id]/route.ts`       |
| `GET /api/sermons/sermon/:id/image` | `sermon/[id]/image/route.ts` |
| `GET /api/sermons/service-types`    | `service-types/route.ts`     |

**Pattern for non-parameterized routes** (e.g., `route.ts`, `books/route.ts`):

```typescript
import { withRateLimit, RateLimitPresets } from '@lib/rate-limiting';

export const GET = wrapHandler(
    withRateLimit(async (req) => {
        // ... existing handler unchanged
    }, RateLimitPresets.relaxed),
);
```

**Pattern for parameterized routes** (e.g., `sermon/[id]/route.ts`, `series/[id]/route.ts`) — these use `wrapHandler<RouteParams>` with a context argument:

```typescript
import { withRateLimit, RateLimitPresets } from '@lib/rate-limiting';

export const GET = wrapHandler<RouteParams>(
    withRateLimit(async (_req, { params }) => {
        // ... existing handler unchanged
    }, RateLimitPresets.relaxed),
);
```

The `withRateLimit` overload already supports `RouteHandler<RouteParams, RouteResponse>`, so no new code is needed — just correct wrapping.

The existing in-memory rate limiter uses per-endpoint per-IP keys and returns standard `X-RateLimit-*` headers. No new infrastructure needed.

---

## Chunk B: perimeter-widgets — Token Validation & Expiry Detection

### B1. JWT Structure Validation

**File:** `packages/shared/src/auth/mp-token.tsx`

Replace the arbitrary 10-character minimum with a JWT structure check. MP OAuth tokens are JWTs with three dot-separated segments.

Add helper function:

```typescript
function isJwtLike(value: string): boolean {
    const parts = value.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
}
```

Change in `getMPToken()`:

```typescript
// Before
if (!token || token === 'null' || token.length < 10) {
// After
if (!token || token === 'null' || !isJwtLike(token)) {
```

This validates structure only — actual JWT verification is the API's responsibility. The check catches obviously invalid tokens (random strings, partial values) without adding a JWT parsing dependency.

**Test updates:** Existing tests use plain strings like `'a-valid-access-token-that-is-long-enough'`. Update all test tokens to JWT-like format: `'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'`. Rename the existing `'returns authenticated: false for short token'` test to `'returns authenticated: false for non-JWT token'` since the validation is now structural, not length-based.

### B2. Proactive Expiry Detection

**File:** `packages/shared/src/auth/mp-token.tsx`

**MPAuthState change:**

```typescript
export interface MPAuthState {
    authenticated: boolean;
    token?: string;
    expiringSoon?: boolean;
}
```

**getMPToken() change:** Replace the existing expiry block entirely with this logic that adds `expiringSoon` detection:

```typescript
if (expiresAfter) {
    const expiresAt = new Date(expiresAfter);
    if (expiresAt < new Date()) {
        return { authenticated: false };
    }
    const fiveMinutes = 5 * 60 * 1000;
    if (expiresAt.getTime() - Date.now() < fiveMinutes) {
        return { authenticated: true, token, expiringSoon: true };
    }
}
return { authenticated: true, token };
```

**AuthProvider change:** Add 60-second interval that calls `refresh()` when authenticated. This re-reads localStorage periodically so the widget detects:

- WordPress silently renewing the token (picks up new token without page reload)
- Token approaching expiry (`expiringSoon` propagates to consumers)

```typescript
useEffect(() => {
    if (!requiresAuth || !authState.authenticated) return;
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
}, [requiresAuth, authState.authenticated, refresh]);
```

No UI changes — widgets can check `auth.expiringSoon` in the future to show a message. The plumbing is what matters now.

**New tests:**

- `getMPToken` returns `expiringSoon: true` when token expires within 5 minutes
- `getMPToken` does NOT return `expiringSoon` when token expires in > 5 minutes
- `isJwtLike` rejects non-JWT strings, accepts valid JWT structure

---

## Implementation Order

1. CORS headers in next.config.mjs (independent, quick)
2. Rate limiting on sermons routes (10 files, same pattern)
3. JWT validation in getMPToken (small change + test updates)
4. Proactive expiry detection (AuthProvider + new tests)

## Out of Scope

- Design token sync between style and widgets (#1)
- Component deduplication between style and widgets (#2)
- Full OAuth refresh flow (widget doesn't own this)
- Rate limiting with Redis (current in-memory is acceptable for single-instance deployment)
- Widget UI for "session expiring" message (future work, uses the `expiringSoon` flag)

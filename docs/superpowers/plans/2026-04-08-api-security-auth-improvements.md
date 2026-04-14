# API Security & Auth Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CORS headers and rate limiting to sermons API endpoints, and improve widget token validation with proactive expiry detection.

**Architecture:** Two independent chunks across two repos. Chunk A (perimeter-api) adds CORS config and wraps 10 sermons routes with the existing rate limiter. Chunk B (perimeter-widgets) replaces length-based token validation with JWT structure check and adds a periodic refresh interval with `expiringSoon` detection.

**Tech Stack:** Next.js 16 (perimeter-api), React 19 (perimeter-widgets), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-08-api-security-auth-improvements-design.md`

---

## File Map

### Chunk A (perimeter-api)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `next.config.mjs` | Add CORS headers for `/api/sermons/:path*` |
| Modify | `src/app/api/(public)/sermons/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/books/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/series/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/series/[id]/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/series/[id]/image/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/series-types/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/speakers/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/sermon/[id]/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/sermon/[id]/image/route.ts` | Add rate limiting |
| Modify | `src/app/api/(public)/sermons/service-types/route.ts` | Add rate limiting |

### Chunk B (perimeter-widgets)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `packages/shared/src/auth/mp-token.tsx` | JWT validation, expiringSoon, refresh interval |
| Modify | `packages/shared/src/auth/__tests__/mp-token.test.ts` | Updated + new tests |

---

## Chunk A: perimeter-api — CORS & Rate Limiting

### Task 1: Add CORS headers for sermons

**Files:**
- Modify: `/Users/parkerb/dev/perimeter/claude/perimeter-api/next.config.mjs`

- [ ] **Step 1: Add CORS entry to headers array**

In `next.config.mjs`, add this entry to the `headers` array after the `/mp/assessments/:path*` block (before the closing `];` on line 101):

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

- [ ] **Step 2: Verify syntax**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-api && node -e "import('./next.config.mjs').then(() => console.log('OK'))"`
Expected: `OK` (no syntax errors).

- [ ] **Step 3: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
git add next.config.mjs
git commit -m "fix: add CORS headers for /api/sermons endpoints"
```

---

### Task 2: Add rate limiting to sermons routes

**Files (all under `src/app/api/(public)/sermons/` in perimeter-api):**
- Modify: `route.ts`
- Modify: `books/route.ts`
- Modify: `series/route.ts`
- Modify: `series/[id]/route.ts`
- Modify: `series/[id]/image/route.ts`
- Modify: `series-types/route.ts`
- Modify: `speakers/route.ts`
- Modify: `sermon/[id]/route.ts`
- Modify: `sermon/[id]/image/route.ts`
- Modify: `service-types/route.ts`

There are two patterns based on whether the route has path parameters.

- [ ] **Step 1: Update non-parameterized routes (6 files)**

For each of these 6 files, add the import and wrap the handler:

**`route.ts`** — Add import, wrap existing handler:
```typescript
import { withRateLimit, RateLimitPresets } from '@lib/rate-limiting';
```
Change:
```typescript
export const GET = wrapHandler(async (req) => {
```
To:
```typescript
export const GET = wrapHandler(
    withRateLimit(async (req) => {
```
And close the `withRateLimit` call before the closing `);`:
```typescript
    }, RateLimitPresets.relaxed),
);
```

**`books/route.ts`** — Same pattern but handler takes no args:
```typescript
import { withRateLimit, RateLimitPresets } from '@lib/rate-limiting';
```
Change:
```typescript
export const GET = wrapHandler(async () => {
```
To:
```typescript
export const GET = wrapHandler(
    withRateLimit(async () => {
```
Close with `}, RateLimitPresets.relaxed),` before final `);`

Apply the same pattern to:
- **`series/route.ts`** — has `(req)` param, same as `route.ts`
- **`series-types/route.ts`** — has `()` no params, same as `books/route.ts`
- **`speakers/route.ts`** — has `()` no params, same as `books/route.ts`
- **`service-types/route.ts`** — has `()` no params, same as `books/route.ts`

- [ ] **Step 2: Update parameterized routes (4 files)**

For each of these 4 files, add the import and wrap the handler. These use `wrapHandler<RouteParams>` with a context argument.

**`series/[id]/route.ts`** — Add import:
```typescript
import { withRateLimit, RateLimitPresets } from '@lib/rate-limiting';
```
Change:
```typescript
export const GET = wrapHandler<RouteParams>(async (_req, { params }) => {
```
To:
```typescript
export const GET = wrapHandler<RouteParams>(
    withRateLimit(async (_req, { params }) => {
```
Close with `}, RateLimitPresets.relaxed),` before final `);`

Apply the same pattern to:
- **`series/[id]/image/route.ts`** — same `wrapHandler<RouteParams>` pattern
- **`sermon/[id]/route.ts`** — same pattern
- **`sermon/[id]/image/route.ts`** — same pattern

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-api && pnpm typecheck`
Expected: No type errors.

- [ ] **Step 4: Run quality**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-api && pnpm quality`
Expected: All checks pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-api
git add src/app/api/\(public\)/sermons/
git commit -m "feat: add rate limiting to all sermons endpoints"
```

---

## Chunk B: perimeter-widgets — Token Validation & Expiry Detection

### Task 3: JWT structure validation + updated tests

**Files:**
- Modify: `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared/src/auth/mp-token.tsx`
- Modify: `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared/src/auth/__tests__/mp-token.test.ts`

- [ ] **Step 1: Add isJwtLike helper and update validation**

In `packages/shared/src/auth/mp-token.tsx`, add the helper function before `getMPToken()`:

```typescript
/**
 * Checks if a string has JWT-like structure (three dot-separated non-empty segments).
 * Does not decode or verify — that's the API's responsibility.
 */
function isJwtLike(value: string): boolean {
    const parts = value.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
}
```

Then in `getMPToken()`, replace line 29:
```typescript
        if (!token || token === 'null' || token.length < 10) {
```
With:
```typescript
        if (!token || token === 'null' || !isJwtLike(token)) {
```

- [ ] **Step 2: Update existing tests to use JWT-like tokens**

In `packages/shared/src/auth/__tests__/mp-token.test.ts`:

Replace the test token string used across multiple tests. Change all occurrences of:
```typescript
'a-valid-access-token-that-is-long-enough'
```
To:
```typescript
'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'
```

Rename the "short token" test (around line 38):
```typescript
    it('returns authenticated: false for short token', () => {
        store['mpp-widgets_AuthToken'] = 'short';
```
To:
```typescript
    it('returns authenticated: false for non-JWT token', () => {
        store['mpp-widgets_AuthToken'] = 'not-a-jwt-token';
```

Add new test for `isJwtLike` behavior:
```typescript
    it('returns authenticated: false for token with wrong segment count', () => {
        store['mpp-widgets_AuthToken'] = 'only.two-segments';
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for token with empty segments', () => {
        store['mpp-widgets_AuthToken'] = 'header..signature';
        expect(getMPToken()).toEqual({ authenticated: false });
    });
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=@perimeter-widgets/shared`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/auth/mp-token.tsx packages/shared/src/auth/__tests__/mp-token.test.ts
git commit -m "fix: replace length check with JWT structure validation in getMPToken"
```

---

### Task 4: Proactive expiry detection

**Files:**
- Modify: `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared/src/auth/mp-token.tsx`
- Modify: `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared/src/auth/__tests__/mp-token.test.ts`

- [ ] **Step 1: Add expiringSoon to MPAuthState**

In `packages/shared/src/auth/mp-token.tsx`, update the interface (around line 15):

```typescript
export interface MPAuthState {
    authenticated: boolean;
    token?: string;
    expiringSoon?: boolean;
}
```

- [ ] **Step 2: Update getMPToken() expiry logic**

Replace the existing expiry block in `getMPToken()`:
```typescript
        if (expiresAfter && new Date(expiresAfter) < new Date()) {
            return { authenticated: false };
        }

        return { authenticated: true, token };
```

With:
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

- [ ] **Step 3: Add refresh interval to AuthProvider**

In the `AuthProvider` component, add a new `useEffect` after the existing storage event listener (after line 82):

```typescript
    // Periodically re-read token to detect expiry or silent renewal
    useEffect(() => {
        if (!requiresAuth || !authState.authenticated) return;
        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, [requiresAuth, authState.authenticated, refresh]);
```

- [ ] **Step 4: Add expiringSoon tests**

In `packages/shared/src/auth/__tests__/mp-token.test.ts`, add these tests:

```typescript
    it('returns expiringSoon: true when token expires within 5 minutes', () => {
        const token = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 2 * 60 * 1000,
        ).toISOString(); // 2 minutes from now
        expect(getMPToken()).toEqual({
            authenticated: true,
            token,
            expiringSoon: true,
        });
    });

    it('does not return expiringSoon when token expires in more than 5 minutes', () => {
        const token = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
        store['mpp-widgets_AuthToken'] = token;
        store['mpp-widgets_ExpiresAfter'] = new Date(
            Date.now() + 30 * 60 * 1000,
        ).toISOString(); // 30 minutes from now
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=@perimeter-widgets/shared`
Expected: All tests pass.

- [ ] **Step 6: Run full quality check**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: All checks pass (excluding pre-existing Prettier warnings in untouched files).

- [ ] **Step 7: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/auth/mp-token.tsx packages/shared/src/auth/__tests__/mp-token.test.ts
git commit -m "feat: add proactive token expiry detection with expiringSoon flag"
```

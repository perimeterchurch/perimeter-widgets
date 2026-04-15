# Widgets Hardening: CI, Error Handling, Docs, Tests

> **Date:** 2026-04-08
> **Branch:** `feat/style-registry-openapi-migration`
> **Scope:** perimeter-widgets only (5 issues from cross-project audit)

---

## Context

A cross-project audit of perimeter-widgets, perimeter-api, and style identified 8 issues. This spec covers the 5 issues scoped to perimeter-widgets. API CORS headers (#3) and cross-project token/component sync (#1, #2) are deferred to separate work streams.

## Issues Addressed

| #   | Issue                                                              | Severity |
| --- | ------------------------------------------------------------------ | -------- |
| 8   | CI workflow commits dist without running quality checks            | High     |
| 11  | `createApiError` duplicated in widget-sermons, should be in shared | Medium   |
| 12  | Shared package docs don't match actual exports                     | Medium   |
| 13  | No React Error Boundary in `mountWidget()`                         | Medium   |
| 15  | Test coverage gaps for error boundary, hooks, components           | Medium   |

---

## 1. CI Quality Gate

**File:** `.github/workflows/build-and-purge.yml`

Add `pnpm quality` step before `pnpm build`. If quality fails, workflow stops — no broken dist gets committed or pushed to CDN.

```yaml
- name: Run quality checks
  run: pnpm quality

- name: Build all widgets
  run: pnpm build
```

No other workflow changes. The existing `--frozen-lockfile` install and dist commit logic remain as-is.

## 2. Move `createApiError` to Shared Package

**Move:** `packages/widget-sermons/src/lib/api-error.ts` -> `packages/shared/src/api/api-error.ts`
**Move:** `packages/widget-sermons/src/__tests__/lib/api-error.test.ts` -> `packages/shared/src/api/__tests__/api-error.test.ts`

**Re-export from shared index:**

```typescript
// API Error
export { createApiError } from './api/api-error';
```

**Update widget-sermons imports:** All hooks in `packages/widget-sermons/src/hooks/` that import `createApiError` change to import from `@perimeter-widgets/shared`. This includes `use-sermons.ts`, `use-sermon-detail.ts`, `use-series.ts`, `use-series-detail.ts`, `use-series-types.ts`, `use-service-types.ts`, `use-books.ts`, and `use-speakers.ts`.

**Delete:** `packages/widget-sermons/src/lib/api-error.ts` and its test file after moving.

No API change — same function signature, same behavior. Future widgets get `createApiError` for free from the shared package.

## 3. Shared Package Docs Update

**File:** `docs/architecture/shared-package.md`

Rewrite to match actual code. Key changes:

- **Exports block:** Replace wholesale with actual `index.ts` content — includes `createApiClient`, `WidgetApiClientOptions`, `paths`, `components`, `operations`, `createApiError`, `PortalContainerProvider`, `usePortalContainer`, `getMPToken`, `AuthProvider`, `useAuth`, `createQueryClient`, and all component re-exports
- **API Client section:** Remove fictional `get<T>()`, `post<T>()` methods and `normalizeHeaders()`. Document actual `openapi-fetch` wrapper pattern: `client.GET('/api/sermons', { params })`
- **Components section:** Replace Button-only listing with actual component categories (ui primitives, perimeter components, motion components)
- **Styles section:** Remove reference to nonexistent `tokens.css` — all tokens live in `base.css`
- **Add PortalContainerProvider** documentation (currently undocumented)
- **Add createApiError** documentation (newly moved from widget-sermons)
- **Add WidgetErrorBoundary** documentation (newly created, see section 4)

## 4. React Error Boundary in `mountWidget()`

**New file:** `packages/shared/src/shadow-dom/error-boundary.tsx`

Class component `WidgetErrorBoundary` that:

- Catches render errors from the widget component tree
- Displays a minimal fallback UI ("Something went wrong" + retry button)
- Logs error via `console.error`
- Styled with existing CSS custom properties (fits widget theme)
- Retry resets error state by toggling a key, forcing React to remount children fresh

**Integration in `mountWidget()`** (`packages/shared/src/shadow-dom/mount.tsx`):

```
StrictMode
  PortalContainerProvider
    QueryClientProvider
      AuthProvider
        ConfigProvider
          WidgetErrorBoundary    <- new
            <Component />
```

Placed inside all providers so:

- Error boundary has access to config/auth context
- Retry re-renders with full provider stack intact
- Only the widget component tree resets, not the providers

**Note:** Errors thrown by providers themselves (auth, config, query) are not caught by this boundary — only errors in `<Component />` and its descendants.

**Export from shared index:**

```typescript
export { WidgetErrorBoundary } from './shadow-dom/error-boundary';
```

## 5. Test Coverage

Three targeted test areas, not exhaustive coverage.

### 5a. Error Boundary Tests

**New file:** `packages/shared/src/shadow-dom/__tests__/error-boundary.test.tsx`

Test cases:

- Renders children normally when no error thrown
- Shows fallback UI when child component throws during render
- Retry button clears error state and re-renders children
- Logs error to `console.error`

### 5b. Widget-Sermons Hook Tests

**New files:** `packages/widget-sermons/src/__tests__/hooks/use-sermons.test.ts`, `use-sermon-detail.test.ts`

Uses MSW to mock API responses. Test cases:

`use-sermons.test.ts`:

- Fetches paginated sermons list with default params
- Applies filter params (search, speakerId, etc.)
- Handles API error responses

`use-sermon-detail.test.ts`:

- Fetches single sermon by ID
- Query disabled when id is null
- Handles 404 response

### 5c. Component Render Test

**New file:** `packages/widget-sermons/src/__tests__/components/SermonCard.test.tsx` (or similar representative component)

Test cases:

- Renders with mock sermon data
- Displays title, speaker name, date
- Basic interaction (click navigates to detail)

---

## Implementation Order

1. CI quality gate (independent, quick)
2. Move `createApiError` to shared (independent, quick)
3. Error boundary component + integration into `mountWidget()`
4. Error boundary tests
5. Hook tests (depend on MSW setup)
6. Component render test
7. Docs update (last — captures all new exports/components)

## Out of Scope

- CORS headers for `/api/sermons/*` in perimeter-api (#3)
- Design token sync between style and widgets (#1)
- Component deduplication between style and widgets (#2)
- Token refresh mechanism or JWT validation improvements (#4, #5)
- Rate limiting (#7)

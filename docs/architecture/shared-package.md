# Shared Package

> **Scope:** API client, auth utility, shadow DOM mount, shared components, design tokens
> **Key files:** `packages/shared/src/`
> **Last verified:** 2026-03-18

---

## Exports

```typescript
// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, MountResult } from './shadow-dom/mount';

// Config
export { ConfigProvider, useConfig } from './shadow-dom/config';
export type { WidgetConfig } from './shadow-dom/config';

// API Client
export { createApiClient, ApiError } from './api/client';
export type { ApiClient, ApiClientOptions } from './api/client';

// Auth
export { getMPToken, AuthProvider, useAuth } from './auth/mp-token';
export type { MPAuthState } from './auth/mp-token';

// React Query
export { createQueryClient } from './api/query-client';

// Components
export { Button } from './components';
export type { ButtonProps } from './components';
```

---

## Shadow DOM Mount (`src/shadow-dom/`)

### `mountWidget(options): MountResult | null`

The core utility that all widgets use to mount into the DOM.

| Option         | Type            | Default  | Description                         |
| -------------- | --------------- | -------- | ----------------------------------- |
| `elementId`    | `string`        | required | ID of the target DOM element        |
| `component`    | `ComponentType` | required | Root React component                |
| `styles`       | `string`        | required | Compiled CSS string for shadow root |
| `defaults`     | `WidgetConfig`  | `{}`     | Default config values               |
| `requiresAuth` | `boolean`       | `false`  | Whether to read MP token            |

Returns `{ destroy: () => void }` or `null` if target element not found.

Active React roots are tracked via a `WeakMap` keyed by shadow root, enabling graceful re-mount (e.g., during HMR) without creating duplicate roots.

### `parseDataAttributes(element): WidgetConfig`

Reads `data-*` attributes from an HTML element. Auto-converts:

- `data-per-page="12"` → `{ perPage: 12 }` (number)
- `data-show-filters="true"` → `{ showFilters: true }` (boolean)
- `data-campus="buckhead"` → `{ campus: 'buckhead' }` (string)

### `ConfigProvider` / `useConfig<T>()`

React context for widget config. `useConfig()` throws if used outside a `ConfigProvider`.

---

## API Client (`src/api/`)

### `createApiClient(options): ApiClient`

| Option         | Type      | Default                   | Description                 |
| -------------- | --------- | ------------------------- | --------------------------- |
| `baseUrl`      | `string`  | auto-resolved (see below) | API base URL                |
| `requiresAuth` | `boolean` | `false`                   | Attach MP token to requests |

**Base URL resolution** (priority order):

1. Explicit `baseUrl` option (e.g., from `data-api-url` attribute)
2. `VITE_API_URL` environment variable
3. `http://localhost:5500` in development, `https://api.perimeter.org` in production

**Methods:** `get<T>(path)`, `post<T>(path, body?)`

**Behavior:**

- Unwraps perimeter-api's `{ success, data }` response envelope
- Attaches `Authorization: Bearer <token>` when `requiresAuth` and token available
- Throws `ApiError` with `status` and `code` on failures
- 401 responses throw `ApiError` with code `TOKEN_EXPIRED`
- Uses `normalizeHeaders()` to safely merge `HeadersInit` values (supports `Headers`, arrays, and plain objects)

### `createQueryClient(): QueryClient`

Creates an isolated React Query client per widget instance.

| Setting                | Value     | Reason                              |
| ---------------------- | --------- | ----------------------------------- |
| `staleTime`            | 5 minutes | Matches perimeter-api cache TTLs    |
| `retry`                | 1         | Embedded widgets, minimal retries   |
| `refetchOnWindowFocus` | `false`   | Widgets are embedded, not full apps |

---

## Auth (`src/auth/`)

### `getMPToken(): MPAuthState`

Reads MP OAuth token from `localStorage`:

- **Key:** `mpp-widgets_AuthToken` — the access token
- **Key:** `mpp-widgets_ExpiresAfter` — expiration timestamp

Returns `{ authenticated: true, token }` or `{ authenticated: false }`.

Validation: token must exist, not be `"null"`, be at least 10 characters, and not be expired.

### `AuthProvider` / `useAuth()`

React context wrapping widgets with auth state. Only reads token when `requiresAuth={true}`. Listens for cross-tab `storage` events to pick up token changes. The context value is memoized with `useMemo` to prevent unnecessary re-renders.

---

## Components (`src/components/`)

### Button

```tsx
<Button variant='primary' size='md' isLoading={false}>
    Click me
</Button>
```

| Prop        | Values                                | Default     |
| ----------- | ------------------------------------- | ----------- |
| `variant`   | `'primary'`, `'secondary'`, `'ghost'` | `'primary'` |
| `size`      | `'sm'`, `'md'`, `'lg'`                | `'md'`      |
| `isLoading` | `boolean`                             | `false`     |

View stories: `pnpm storybook` → Primitives/Button

---

## Styles (`src/styles/`)

### `tokens.css`

Tailwind v4 design tokens via `@theme` directive. See [Design Tokens](../reference/design-tokens.md).

### `base.css`

Imports Tailwind + tokens. Provides shadow DOM `:host` reset (resets inherited styles, sets font, color, line-height, box-sizing).

---

## Related Docs

- [Architecture Overview](overview.md) — How the shared package fits in the monorepo
- [Design Tokens](../reference/design-tokens.md) — Full token reference
- [Testing](../guides/testing.md) — How to test shared utilities

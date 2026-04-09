# Shared Package

> **Scope:** API client, auth utility, shadow DOM mount, shared components, design tokens
> **Key files:** `packages/shared/src/`
> **Last verified:** 2026-04-08

---

## Exports

```typescript
// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, MountResult } from './shadow-dom/mount';

// Error Boundary
export { WidgetErrorBoundary } from './shadow-dom/error-boundary';

// API Client
export { createApiClient } from './api/client';
export type {
    WidgetApiClientOptions,
    paths,
    components,
    operations,
} from './api/client';

// API Error
export { createApiError } from './api/api-error';

// Auth
export { getMPToken, AuthProvider, useAuth } from './auth/mp-token';
export type { MPAuthState } from './auth/mp-token';

// Config
export { ConfigProvider, useConfig } from './shadow-dom/config';
export type { WidgetConfig } from './shadow-dom/config';

// Portal Container (shadow DOM)
export {
    PortalContainerProvider,
    usePortalContainer,
} from './shadow-dom/portal-container';

// React Query
export { createQueryClient } from './api/query-client';

// Components
export * from './components';
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

Active React roots are tracked via a `WeakMap` keyed by host element, enabling graceful re-mount (e.g., during HMR) without creating duplicate roots.

The mount tree wraps the widget component in this order:

```
StrictMode
  PortalContainerProvider
    QueryClientProvider
      AuthProvider
        ConfigProvider
          WidgetErrorBoundary
            <Component />
```

### `parseDataAttributes(element): WidgetConfig`

Reads `data-*` attributes from an HTML element. Auto-converts:

- `data-per-page="12"` → `{ perPage: 12 }` (number)
- `data-show-filters="true"` → `{ showFilters: true }` (boolean)
- `data-campus="buckhead"` → `{ campus: 'buckhead' }` (string)

### `ConfigProvider` / `useConfig<T>()`

React context for widget config. `useConfig()` throws if used outside a `ConfigProvider`.

---

## API Client (`src/api/`)

### `createApiClient(options): Client<paths>`

Creates a typed `openapi-fetch` client bound to the perimeter-api OpenAPI schema.

| Option         | Type                     | Default       | Description                 |
| -------------- | ------------------------ | ------------- | --------------------------- |
| `baseUrl`      | `string`                 | auto-resolved | API base URL                |
| `requiresAuth` | `boolean`                | `false`       | Attach MP token to requests |
| `headers`      | `Record<string, string>` | —             | Additional request headers  |

**Base URL resolution** (priority order):

1. Explicit `baseUrl` option (e.g., from `data-api-url` attribute)
2. `VITE_API_URL` environment variable
3. `''` (relative) in development, `https://api.perimeter.org` in production

**Usage:**

```typescript
const client = createApiClient({ baseUrl: config.apiUrl });
const { data, error } = await client.GET('/api/sermons', {
    params: { query: { search, page, perPage } },
});
if (error) throw createApiError('Failed to fetch sermons', error);
```

The client is fully typed via the generated `paths` type from `@perimeterchurch/api`. Route paths, query params, and response shapes are all inferred.

### `createQueryClient(): QueryClient`

Creates an isolated React Query client per widget instance.

| Setting                | Value     | Reason                              |
| ---------------------- | --------- | ----------------------------------- |
| `staleTime`            | 5 minutes | Matches perimeter-api cache TTLs    |
| `retry`                | 1         | Embedded widgets, minimal retries   |
| `refetchOnWindowFocus` | `false`   | Widgets are embedded, not full apps |

---

## API Error (`src/api/api-error.ts`)

### `createApiError(label, error): Error`

Wraps an `openapi-fetch` error response into a descriptive `Error` instance.

```typescript
export function createApiError(label: string, error: unknown): Error;
```

Extracts `status` and `message` from the error object when present:

- `createApiError('Failed to fetch sermons', { status: 404, message: 'Not found' })`
  → `Error: 'Failed to fetch sermons: status 404: Not found'`
- Falls back to `Error(label)` for non-object errors.

Always use this after a failed `client.GET()` / `client.POST()` call to produce readable error messages in React Query error states.

---

## Error Boundary (`src/shadow-dom/error-boundary.tsx`)

### `WidgetErrorBoundary`

A React class component that catches render errors within the widget tree. It is automatically included in the `mountWidget()` provider tree — widgets do not need to add it manually.

**Behavior:**

- On error: logs to console and renders a fallback UI with a "Try again" button
- On retry: increments a `retryKey` on the inner `div`, which remounts the widget subtree
- Logs via `console.error('[perimeter-widgets] Render error:', error, info)`

**Fallback UI:** centered text `"Something went wrong loading this content."` with a styled retry button using `bg-primary` / `text-primary-foreground` tokens.

---

## Auth (`src/auth/`)

### `getMPToken(): MPAuthState`

Reads MP OAuth token from `localStorage`:

- **Key:** `mpp-widgets_AuthToken` — the access token
- **Key:** `mpp-widgets_ExpiresAfter` — expiration timestamp

Returns `{ authenticated: true, token }` or `{ authenticated: false }`.

Validation: token must exist, not be `"null"`, be at least 10 characters, and not be expired. Handles environments where `localStorage` is unavailable (SSR, iframe restrictions) by returning `{ authenticated: false }`.

### `AuthProvider` / `useAuth()`

React context wrapping widgets with auth state. Only reads the token when `requiresAuth={true}`. Listens for cross-tab `storage` events to pick up token changes. The context value is memoized with `useMemo` to prevent unnecessary re-renders.

---

## Portal Container (`src/shadow-dom/portal-container.tsx`)

### `PortalContainerProvider` / `usePortalContainer()`

Provides the shadow root's inner mount `div` as a portal target for components that need to render outside the normal DOM tree (e.g., modals, dropdowns, tooltips) while staying inside the shadow DOM for style isolation.

`mountWidget()` sets this automatically. Components that need it call `usePortalContainer()`:

```typescript
const container = usePortalContainer();
// Pass to Dialog, DropdownMenu, or Tooltip `container` prop
```

Without this, portals would escape the shadow root and lose access to injected CSS custom properties.

---

## Components (`src/components/`)

Components are re-exported from the Perimeter style registry. Import from `@perimeter-widgets/shared`.

### Base UI (prefixed to avoid collision)

| Export         | Description                 |
| -------------- | --------------------------- |
| `BaseInput`    | Unstyled input primitive    |
| `BaseTextarea` | Unstyled textarea primitive |
| `BaseButton`   | Unstyled button primitive   |
| `BaseDialog`   | Unstyled dialog primitive   |
| `InputGroup`   | Input with label + error    |

### Perimeter Components

Avatar, Badge, Button, Calendar, Card, Checkbox, Combobox, Command, Dialog, DropdownMenu, Empty, Input, Label, Pagination, Progress, RadioGroup, ScrollArea, Select, Separator, Skeleton, Spinner, Switch, Tabs, Textarea, Tooltip, IconSelect, MultiCombobox, SortSelect

### Utility

| Export | Description                        |
| ------ | ---------------------------------- |
| `cn`   | `clsx` + `tailwind-merge` combiner |

View all stories: `pnpm storybook`

---

## Styles (`src/styles/`)

### `base.css`

The single CSS entry point for all widgets. Imports Tailwind v4 and defines:

- **Shadow DOM `:host` reset** — clears inherited styles, sets `font-family`, `color`, `line-height`, `display: block`
- **Dark mode** via `@custom-variant dark` keyed to `data-theme="dark"` on the wrapper `div`. Set via `data-theme` attribute on the host element.
- **OKLch color space** — all color tokens use `oklch()` for perceptually uniform palette steps
- **CSS custom properties** — all design tokens exposed as `--color-*`, `--font-*`, `--radius-*` variables

See [Design Tokens](../reference/design-tokens.md) for the full token reference.

---

## Style Registry Sync

Primitive UI components and design tokens are sourced from the style project's shadcn registry at `https://style.perimeter.org/r`. The shared package is a consumer — style is the single source of truth.

### Syncing Components

```bash
pnpm sync:style
```

Pulls 20 primitive components from the style registry into `src/components/ui/perimeter/` via shadcn CLI, then rewrites `@/` imports to relative paths. Protected files (base UI wrappers at `ui/button.tsx`, `ui/dialog.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `ui/input-group.tsx`) are backed up and restored automatically.

The 6 portal-aware components (dialog, combobox, select, dropdown-menu, tooltip, multi-combobox) and 2 widget-specific compositions (icon-select, sort-select) are widget-owned and not synced.

### Syncing Tokens

```bash
pnpm sync:tokens
```

Fetches the default theme from the registry and regenerates CSS custom properties in `src/styles/base.css` between `@sync:tokens-start` / `@sync:tokens-end` markers. Shadow DOM selectors (`:host`, `data-theme`) are preserved.

### When to Sync

Run both commands after the style project publishes updates:

1. Style project merges changes and deploys registry
2. Run `pnpm sync:style && pnpm sync:tokens` in perimeter-widgets
3. Verify: `pnpm quality` + visual check in storyboard
4. Commit the synced files

---

## Related Docs

- [Architecture Overview](overview.md) — How the shared package fits in the monorepo
- [Design Tokens](../reference/design-tokens.md) — Full token reference
- [Testing](../guides/testing.md) — How to test shared utilities

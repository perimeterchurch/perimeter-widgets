# Testing Guide

> **Scope:** Vitest setup, widget test patterns, mocking API hooks, the bundle-budget guard
> **Key files:** `widgets/<name>/vitest.config.ts`, `widgets/<name>/tests/setup.ts`

---

## Setup

- **Framework:** Vitest with the `jsdom` environment.
- **Per-widget config:** each widget owns a small `vitest.config.ts` (`environment: 'jsdom'`, `include: ['tests/**/*.test.{ts,tsx}']`, `setupFiles: ['./tests/setup.ts']`).
- **Setup file:** `tests/setup.ts` imports `@testing-library/jest-dom/vitest` and calls Testing Library's `cleanup()` in `afterEach`.
- **React rendering:** `@testing-library/react` (`render`, `screen`, `renderHook`) + `@testing-library/user-event`.

### Commands

Tests run through Turborepo from the root:

```bash
pnpm test                                       # all tests
pnpm test --filter=@perimeter/widget-sermons     # one widget
pnpm test --filter=@perimeter/ui                 # one package
```

Each widget/package also has a local `vitest run` script (`test`), so you can run a scoped suite directly:

```bash
pnpm --filter @perimeter/widget-sermons exec vitest run
pnpm --filter @perimeter/widget-sermons exec vitest run tests/App.test.tsx
```

> Packages with no local vitest binary delegate to `turbo test` — scope them with `--filter` rather than running `pnpm vitest` inside the directory.

---

## Test Patterns

### Testing widget components

The new platform passes config in as a plain prop (the legacy `useConfig()`/`AuthProvider`/`ConfigProvider` stack is gone). Parse defaults from the widget's zod schema and render the component directly:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';
import { SermonsConfigSchema } from '../src/types';

const config = SermonsConfigSchema.parse({}); // schema defaults
render(<App config={config} />);
expect(screen.getByRole('tab', { name: /sermons/i })).toBeInTheDocument();
```

### Mocking API hooks

Components that fetch through `@perimeter/api-hooks` need an `ApiClient` context the test doesn't provide. Mock the hooks with stable, query-result-shaped envelopes so the tree renders deterministically:

```tsx
vi.mock('@perimeter/api-hooks', () => ({
    useSermons: () => ({
        data: {
            success: true,
            data: { sermons: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
        },
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
    }),
    // …mock the other hooks the component imports
}));
```

### The bundle-budget guard

Every widget ships a `tests/bundle.test.ts` that builds the widget (`pnpm exec vite build`) and asserts the output: a single IIFE at `dist/index.js`, **no** separate `.css` asset (CSS is inlined), and that the bundle references the widget name and the `PerimeterWidgets` global. Per-widget gzipped size budgets are enforced here (sermons' budget is 900 KiB).

---

## jsdom Quirks

### Shadow DOM

jsdom supports `attachShadow()` but with limitations. Mount-path tests focus on shadow-root creation, style injection, and mount/unmount/re-mount lifecycle; full content rendering inside a shadow root may not work in jsdom, so component assertions render the React tree directly (as above) rather than through `mount()`.

### React async teardown

Tests that exercise `mount()` must call the returned `destroy()` in `afterEach` to stop React from rendering after jsdom is torn down:

```typescript
let mounted: MountedWidget | null = null;

afterEach(() => {
    mounted?.destroy();
    mounted = null;
});
```

---

## Turborepo Caching

Turborepo caches test results per package — unchanged packages skip tests entirely on subsequent runs, which can mask a failure. Force a real re-run before trusting a CI-bound gate:

```bash
pnpm test --force
# or scoped:
pnpm exec turbo run test --filter=@perimeter/studio --force
```

---

## Related Docs

- [Developer Setup](developer-setup.md) — Commands and the studio
- [Architecture Overview](../architecture/overview.md) — The mount path under test

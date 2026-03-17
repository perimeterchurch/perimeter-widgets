# Testing Guide

> **Scope:** Vitest setup, widget test patterns, mocking, jsdom quirks
> **Key files:** `packages/vite-preset/src/test-setup.ts`, `packages/shared/vitest.config.ts`
> **Last verified:** 2026-03-17

---

## Setup

- **Framework:** Vitest with jsdom environment
- **Globals:** Enabled — `describe`, `it`, `expect`, `vi`, `beforeEach` available without import
- **DOM matchers:** `@testing-library/jest-dom/vitest` loaded via shared `test-setup.ts`
- **React rendering:** `@testing-library/react` for component tests

### Commands

```bash
pnpm test                              # Run all tests (via Turborepo)
pnpm test --filter=widget-sermons      # Run tests for a single widget
pnpm test --filter=@perimeter-widgets/shared  # Run shared package tests

# Inside a package directory:
pnpm vitest run                        # Run all tests once
pnpm vitest run src/__tests__/App.test.tsx  # Run a single file
pnpm vitest --reporter verbose         # Verbose output
```

---

## Test Config

### Widget tests

Every widget uses `createWidgetTestConfig()` from the vite-preset:

```typescript
// packages/widget-sermons/vitest.config.ts
import { createWidgetTestConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetTestConfig();
```

This configures jsdom, globals, React plugin, and jest-dom matchers.

### Shared package tests

The shared package has its own `vitest.config.ts` that references the same `test-setup.ts` for consistent matcher availability.

---

## Test Patterns

### Testing widget components

Wrap components in the same provider stack that `mountWidget()` uses:

```tsx
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, AuthProvider, ConfigProvider } from '@perimeter-widgets/shared';

function renderWithProviders(
    ui: React.ReactElement,
    config: Record<string, unknown> = {},
) {
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider requiresAuth={false}>
                <ConfigProvider config={config}>
                    {ui}
                </ConfigProvider>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

// Usage
renderWithProviders(<SermonsApp />, { campus: 'buckhead', perPage: 12 });
expect(screen.getByText('Sermons')).toBeInTheDocument();
```

### Testing the API client

Mock `fetch` globally:

```typescript
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
        success: true,
        data: [{ id: 1, title: 'Test' }],
    }),
});

const client = createApiClient({ baseUrl: 'https://api.test.com' });
const result = await client.get('/api/endpoint');
expect(result).toEqual([{ id: 1, title: 'Test' }]);
```

### Testing auth

Mock localStorage with `vi.stubGlobal`:

```typescript
beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    });
});
```

**Why not `localStorage.clear()`?** jsdom 26 on Node 25 has broken `localStorage` methods. The `vi.stubGlobal` approach works reliably.

---

## jsdom Quirks

### Shadow DOM

jsdom supports `attachShadow()` but with limitations. Shadow DOM tests focus on:
- Shadow root creation
- Style injection
- Mount/unmount lifecycle
- Re-mount safety (reusing existing shadow root)

Content rendering inside shadow roots may not work fully in jsdom.

### React async teardown

Mount utility tests must call `destroy()` in `afterEach` to prevent React async rendering after jsdom has been torn down:

```typescript
let mountResult: MountResult | null = null;

afterEach(() => {
    mountResult?.destroy();
    mountResult = null;
});
```

---

## Turborepo Caching

Turborepo caches test results per package. Unchanged packages skip tests entirely on subsequent runs. To force a re-run:

```bash
pnpm test --force
```

---

## Related Docs

- [Vite Preset](../architecture/vite-preset.md) — Test config details
- [Shared Package](../architecture/shared-package.md) — Utilities under test

# Widgets Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden perimeter-widgets with CI quality gate, centralized error handling, error boundary, targeted tests, and accurate docs.

**Architecture:** All changes are in the perimeter-widgets repo on branch `feat/style-registry-openapi-migration`. Changes span shared package (new error boundary, moved API error util) and widget-sermons (import updates, new tests). CI workflow gets a quality gate before dist commit.

**Tech Stack:** React 19, Vitest 3, Testing Library React 16, MSW 2, TypeScript 5.9, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-04-08-widgets-hardening-design.md`

---

## File Map

| Action | File                                                                     | Responsibility                                    |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------- |
| Modify | `.github/workflows/build-and-purge.yml`                                  | Add quality gate step                             |
| Create | `packages/shared/src/api/api-error.ts`                                   | Moved `createApiError` function                   |
| Create | `packages/shared/src/api/__tests__/api-error.test.ts`                    | Moved tests for `createApiError`                  |
| Modify | `packages/shared/src/index.ts`                                           | Export `createApiError` and `WidgetErrorBoundary` |
| Delete | `packages/widget-sermons/src/lib/api-error.ts`                           | Replaced by shared version                        |
| Delete | `packages/widget-sermons/src/__tests__/lib/api-error.test.ts`            | Replaced by shared version                        |
| Modify | `packages/widget-sermons/src/hooks/use-sermons.ts`                       | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-sermon-detail.ts`                 | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-series.ts`                        | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-series-detail.ts`                 | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-series-types.ts`                  | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-service-types.ts`                 | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-books.ts`                         | Import from shared                                |
| Modify | `packages/widget-sermons/src/hooks/use-speakers.ts`                      | Import from shared                                |
| Create | `packages/shared/src/shadow-dom/error-boundary.tsx`                      | WidgetErrorBoundary component                     |
| Modify | `packages/shared/src/shadow-dom/mount.tsx`                               | Wrap Component with error boundary                |
| Create | `packages/shared/src/shadow-dom/__tests__/error-boundary.test.tsx`       | Error boundary tests                              |
| Create | `packages/widget-sermons/src/__tests__/hooks/use-sermons.test.tsx`       | Hook tests with MSW                               |
| Create | `packages/widget-sermons/src/__tests__/hooks/use-sermon-detail.test.tsx` | Hook tests with MSW                               |
| Create | `packages/widget-sermons/src/__tests__/components/SermonGrid.test.tsx`   | Component render test                             |
| Modify | `docs/architecture/shared-package.md`                                    | Rewrite to match actual code                      |

---

## Chunk 1: CI Quality Gate + Move createApiError

### Task 1: Add CI quality gate

**Files:**

- Modify: `.github/workflows/build-and-purge.yml:20-25`

- [ ] **Step 1: Add quality check step to workflow**

In `.github/workflows/build-and-purge.yml`, add this step between "Install dependencies" and "Build all widgets":

```yaml
- name: Run quality checks
  run: pnpm quality
```

- [ ] **Step 2: Verify YAML is valid**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && cat .github/workflows/build-and-purge.yml | head -30`
Expected: New step appears between install and build steps.

- [ ] **Step 3: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add .github/workflows/build-and-purge.yml
git commit -m "fix: add quality gate to CI before dist commit"
```

---

### Task 2: Move createApiError to shared package

**Files:**

- Create: `packages/shared/src/api/api-error.ts`
- Create: `packages/shared/src/api/__tests__/api-error.test.ts`
- Modify: `packages/shared/src/index.ts`
- Delete: `packages/widget-sermons/src/lib/api-error.ts`
- Delete: `packages/widget-sermons/src/__tests__/lib/api-error.test.ts`
- Modify: 8 hook files in `packages/widget-sermons/src/hooks/`

- [ ] **Step 1: Create api-error.ts in shared package**

Create `packages/shared/src/api/api-error.ts` with the exact content from `packages/widget-sermons/src/lib/api-error.ts`:

```typescript
/**
 * Creates a descriptive error from an openapi-fetch error response.
 * Extracts status and message when available for easier debugging.
 */
export function createApiError(label: string, error: unknown): Error {
    if (error && typeof error === 'object') {
        const status =
            'status' in error ?
                (error as { status?: number }).status
            :   undefined;
        const message =
            'message' in error ?
                (error as { message?: string }).message
            :   undefined;
        const detail = [status && `status ${status}`, message]
            .filter(Boolean)
            .join(': ');
        return new Error(detail ? `${label}: ${detail}` : label);
    }
    return new Error(label);
}
```

- [ ] **Step 2: Move test file to shared package**

Create `packages/shared/src/api/__tests__/api-error.test.ts` with the exact content from `packages/widget-sermons/src/__tests__/lib/api-error.test.ts`, updating the import path:

```typescript
import { describe, it, expect } from 'vitest';
import { createApiError } from '../api-error';

describe('createApiError', () => {
    it('returns error with just label when error is null', () => {
        const err = createApiError('Failed to fetch', null);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Failed to fetch');
    });

    it('returns error with just label when error is undefined', () => {
        const err = createApiError('Failed to fetch', undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Failed to fetch');
    });

    it('extracts status from error object', () => {
        const err = createApiError('Request failed', { status: 404 });
        expect(err.message).toBe('Request failed: status 404');
    });

    it('extracts message from error object', () => {
        const err = createApiError('Request failed', {
            message: 'Not Found',
        });
        expect(err.message).toBe('Request failed: Not Found');
    });

    it('combines status and message', () => {
        const err = createApiError('Request failed', {
            status: 500,
            message: 'Internal Server Error',
        });
        expect(err.message).toBe(
            'Request failed: status 500: Internal Server Error',
        );
    });

    it('handles non-object errors gracefully', () => {
        const errStr = createApiError('Request failed', 'some string');
        expect(errStr.message).toBe('Request failed');

        const errNum = createApiError('Request failed', 42);
        expect(errNum.message).toBe('Request failed');

        const errBool = createApiError('Request failed', true);
        expect(errBool.message).toBe('Request failed');
    });

    it('handles object with neither status nor message', () => {
        const err = createApiError('Request failed', { code: 'ERR_NETWORK' });
        expect(err.message).toBe('Request failed');
    });
});
```

- [ ] **Step 3: Export from shared index**

Add to `packages/shared/src/index.ts` after the existing API Client section:

```typescript
// API Error
export { createApiError } from './api/api-error';
```

- [ ] **Step 4: Run shared package tests to verify move**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=@perimeter-widgets/shared`
Expected: All tests pass including new api-error tests.

- [ ] **Step 5: Update all 8 hook imports in widget-sermons**

In each of these files, replace `import { createApiError } from '../lib/api-error';` with `import { createApiError } from '@perimeter-widgets/shared';`:

- `packages/widget-sermons/src/hooks/use-sermons.ts` (line 5)
- `packages/widget-sermons/src/hooks/use-sermon-detail.ts` (line 4)
- `packages/widget-sermons/src/hooks/use-series.ts`
- `packages/widget-sermons/src/hooks/use-series-detail.ts`
- `packages/widget-sermons/src/hooks/use-series-types.ts`
- `packages/widget-sermons/src/hooks/use-service-types.ts`
- `packages/widget-sermons/src/hooks/use-books.ts`
- `packages/widget-sermons/src/hooks/use-speakers.ts`

Since `createApiClient` is already imported from `@perimeter-widgets/shared` in each file, merge onto the same import line:

Before:

```typescript
import { createApiClient } from '@perimeter-widgets/shared';
...
import { createApiError } from '../lib/api-error';
```

After:

```typescript
import { createApiClient, createApiError } from '@perimeter-widgets/shared';
```

- [ ] **Step 6: Delete old files from widget-sermons**

Delete:

- `packages/widget-sermons/src/lib/api-error.ts`
- `packages/widget-sermons/src/__tests__/lib/api-error.test.ts`

Check if `packages/widget-sermons/src/lib/` is now empty and can be removed too.

- [ ] **Step 7: Run widget-sermons tests to verify imports**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=widget-sermons`
Expected: All tests pass with new import paths.

- [ ] **Step 8: Run full quality check**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: All checks pass (typecheck + lint + format + test).

- [ ] **Step 9: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/api/api-error.ts packages/shared/src/api/__tests__/api-error.test.ts packages/shared/src/index.ts packages/widget-sermons/src/hooks/ packages/widget-sermons/src/lib/ packages/widget-sermons/src/__tests__/lib/
git commit -m "refactor: move createApiError to shared package"
```

---

## Chunk 2: Error Boundary

### Task 3: Create WidgetErrorBoundary component

**Files:**

- Create: `packages/shared/src/shadow-dom/error-boundary.tsx`
- Modify: `packages/shared/src/shadow-dom/mount.tsx`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the error boundary component**

Create `packages/shared/src/shadow-dom/error-boundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    retryKey: number;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, retryKey: 0 };

    static getDerivedStateFromError(): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[perimeter-widgets] Render error:', error, info);
    }

    handleRetry = () => {
        this.setState((prev) => ({
            hasError: false,
            retryKey: prev.retryKey + 1,
        }));
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className='flex flex-col items-center justify-center gap-4 p-8 text-center'>
                    <p className='text-sm text-muted-foreground'>
                        Something went wrong loading this content.
                    </p>
                    <button
                        type='button'
                        onClick={this.handleRetry}
                        className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return <div key={this.state.retryKey}>{this.props.children}</div>;
    }
}
```

- [ ] **Step 2: Integrate into mountWidget()**

In `packages/shared/src/shadow-dom/mount.tsx`, add the import at the top:

```typescript
import { WidgetErrorBoundary } from './error-boundary';
```

Then wrap `<Component />` with the error boundary in the render call (line 95-107). Replace:

```tsx
<ConfigProvider config={config}>
    <Component />
</ConfigProvider>
```

With:

```tsx
<ConfigProvider config={config}>
    <WidgetErrorBoundary>
        <Component />
    </WidgetErrorBoundary>
</ConfigProvider>
```

- [ ] **Step 3: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
// Error Boundary
export { WidgetErrorBoundary } from './shadow-dom/error-boundary';
```

- [ ] **Step 4: Run typecheck to verify integration**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm typecheck`
Expected: No type errors.

- [ ] **Step 5: Run existing mount tests to verify no regression**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=@perimeter-widgets/shared`
Expected: All existing tests pass (mount, config, client, api-error).

- [ ] **Step 6: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/shadow-dom/error-boundary.tsx packages/shared/src/shadow-dom/mount.tsx packages/shared/src/index.ts
git commit -m "feat: add WidgetErrorBoundary to mountWidget"
```

---

## Chunk 3: Tests

### Task 4: Error boundary tests

**Files:**

- Create: `packages/shared/src/shadow-dom/__tests__/error-boundary.test.tsx`

- [ ] **Step 1: Ensure @testing-library/user-event is available**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && ls packages/shared/node_modules/@testing-library/user-event 2>/dev/null && echo "EXISTS" || echo "MISSING"`

If MISSING:
Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm add -D @testing-library/user-event --filter=@perimeter-widgets/shared`

- [ ] **Step 2: Write error boundary tests**

Create `packages/shared/src/shadow-dom/__tests__/error-boundary.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetErrorBoundary } from '../error-boundary';

function GoodChild() {
    return <div>Widget content</div>;
}

function ThrowingChild(): never {
    throw new Error('Render explosion');
}

describe('WidgetErrorBoundary', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders children when no error is thrown', () => {
        render(
            <WidgetErrorBoundary>
                <GoodChild />
            </WidgetErrorBoundary>,
        );

        expect(screen.getByText('Widget content')).toBeInTheDocument();
    });

    it('shows fallback UI when child throws during render', () => {
        // Suppress React error boundary console output in test
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <WidgetErrorBoundary>
                <ThrowingChild />
            </WidgetErrorBoundary>,
        );

        expect(
            screen.getByText('Something went wrong loading this content.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /try again/i }),
        ).toBeInTheDocument();
    });

    it('logs error via console.error', () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        render(
            <WidgetErrorBoundary>
                <ThrowingChild />
            </WidgetErrorBoundary>,
        );

        expect(errorSpy).toHaveBeenCalledWith(
            '[perimeter-widgets] Render error:',
            expect.any(Error),
            expect.objectContaining({ componentStack: expect.any(String) }),
        );
    });

    it('recovers when retry button is clicked', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        let shouldThrow = true;

        function ConditionalChild() {
            if (shouldThrow) throw new Error('Render explosion');
            return <div>Recovered content</div>;
        }

        render(
            <WidgetErrorBoundary>
                <ConditionalChild />
            </WidgetErrorBoundary>,
        );

        expect(
            screen.getByText('Something went wrong loading this content.'),
        ).toBeInTheDocument();

        // Fix the error condition, then retry
        shouldThrow = false;
        await userEvent.click(
            screen.getByRole('button', { name: /try again/i }),
        );

        expect(screen.getByText('Recovered content')).toBeInTheDocument();

        errorSpy.mockRestore();
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=@perimeter-widgets/shared`
Expected: All tests pass including new error boundary tests.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/shared/src/shadow-dom/__tests__/error-boundary.test.tsx
git commit -m "test: add WidgetErrorBoundary tests"
```

---

### Task 5: Hook tests for widget-sermons

**Files:**

- Create: `packages/widget-sermons/src/__tests__/hooks/use-sermons.test.tsx`
- Create: `packages/widget-sermons/src/__tests__/hooks/use-sermon-detail.test.tsx`

These tests use MSW to intercept API calls and verify the hooks fetch data correctly.

- [ ] **Step 1: Check if MSW is available in widget-sermons**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && ls packages/widget-sermons/node_modules/msw 2>/dev/null && echo "EXISTS" || echo "MISSING"`

If MISSING, add it:
Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm add -D msw --filter=widget-sermons`

- [ ] **Step 2: Write use-sermons hook test**

Create `packages/widget-sermons/src/__tests__/hooks/use-sermons.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSermons } from '../../hooks/use-sermons';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSermonsResponse = {
    success: true as const,
    data: {
        sermons: [
            {
                id: 1,
                title: 'Test Sermon',
                subtitle: null,
                date: '2026-01-01',
                shortDescription: 'A test sermon',
                bannerUrl: null,
                speaker: { id: 1, name: 'John Smith' },
                series: { id: 1, title: 'Test Series' },
                congregation: { id: 1 },
                book: null,
            },
        ],
        pagination: { page: 1, perPage: 12, total: 1, totalPages: 1 },
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons`, () => {
        return HttpResponse.json(mockSermonsResponse);
    }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const testConfig: SermonsConfig = {
    perPage: 12,
    defaultTab: 'sermons',
    defaultView: 'grid',
    display: 'full',
    apiUrl: BASE_URL,
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe('useSermons', () => {
    it('fetches paginated sermons with default params', async () => {
        const { result } = renderHook(
            () => useSermons({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.sermons).toHaveLength(1);
        expect(result.current.data?.sermons[0].title).toBe('Test Sermon');
    });

    it('passes filter params to API', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/sermons`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json(mockSermonsResponse);
            }),
        );

        const { result } = renderHook(
            () =>
                useSermons({
                    config: testConfig,
                    search: 'grace',
                    selectedSpeakerIds: [5],
                }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('search')).toBe('grace');
        expect(url.searchParams.get('speakerId')).toBe('5');
    });

    it('throws on API error', async () => {
        server.use(
            http.get(`${BASE_URL}/api/sermons`, () => {
                return HttpResponse.json(
                    { success: false, error: { message: 'Server error' } },
                    { status: 500 },
                );
            }),
        );

        const { result } = renderHook(
            () => useSermons({ config: testConfig }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error?.message).toContain(
            'Failed to fetch sermons',
        );
    });
});
```

- [ ] **Step 3: Write use-sermon-detail hook test**

Create `packages/widget-sermons/src/__tests__/hooks/use-sermon-detail.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useSermonDetail } from '../../hooks/use-sermon-detail';
import type { SermonsConfig } from '../../types';

const BASE_URL = 'http://test-api.local';

const mockSermonDetail = {
    success: true as const,
    data: {
        id: 42,
        title: 'Grace Abounding',
        subtitle: null,
        date: '2026-03-15',
        description: '<p>Full sermon description</p>',
        shortDescription: 'A sermon on grace',
        bannerUrl: null,
        speaker: { id: 1, name: 'John Smith', bio: null },
        series: { id: 1, title: 'Grace Series' },
        congregation: { id: 1 },
        book: { id: 1, name: 'Romans' },
        transcript: null,
        scriptureLinks: null,
        links: [
            {
                id: 1,
                url: 'https://cdn.example.com/audio.mp3',
                type: 'audio/mpeg',
                mediaType: 'audio' as const,
                duration: '00:45:00',
                position: 1,
            },
        ],
    },
};

const server = setupServer(
    http.get(`${BASE_URL}/api/sermons/sermon/:id`, ({ params }) => {
        if (params.id === '999') {
            return HttpResponse.json(
                { success: false, error: { message: 'Not found' } },
                { status: 404 },
            );
        }
        return HttpResponse.json(mockSermonDetail);
    }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const testConfig: SermonsConfig = {
    perPage: 12,
    defaultTab: 'sermons',
    defaultView: 'grid',
    display: 'full',
    apiUrl: BASE_URL,
};

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe('useSermonDetail', () => {
    it('fetches sermon by ID', async () => {
        const { result } = renderHook(() => useSermonDetail(42, testConfig), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.title).toBe('Grace Abounding');
        expect(result.current.data?.speaker.name).toBe('John Smith');
    });

    it('is disabled when id is null', () => {
        const { result } = renderHook(() => useSermonDetail(null, testConfig), {
            wrapper: createWrapper(),
        });

        expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles 404 response', async () => {
        const { result } = renderHook(() => useSermonDetail(999, testConfig), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error?.message).toContain(
            'Failed to fetch sermon detail',
        );
    });
});
```

- [ ] **Step 4: Run hook tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=widget-sermons`
Expected: All tests pass including new hook tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/widget-sermons/src/__tests__/hooks/
git commit -m "test: add hook tests for useSermons and useSermonDetail"
```

---

### Task 6: Component render test

**Files:**

- Create: `packages/widget-sermons/src/__tests__/components/SermonGrid.test.tsx`

- [ ] **Step 1: Ensure @testing-library/user-event is available**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && ls packages/widget-sermons/node_modules/@testing-library/user-event 2>/dev/null && echo "EXISTS" || echo "MISSING"`

If MISSING:
Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm add -D @testing-library/user-event --filter=widget-sermons`

- [ ] **Step 2: Write SermonGrid render test**

Create `packages/widget-sermons/src/__tests__/components/SermonGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SermonGrid } from '../../components/sermons/SermonGrid';

const mockSermons = [
    {
        id: 1,
        title: 'Amazing Grace',
        subtitle: null,
        date: '2026-01-15',
        shortDescription: 'A sermon about grace',
        bannerUrl: null,
        speaker: { id: 1, name: 'John Smith' },
        series: { id: 1, title: 'Grace Series' },
        congregation: { id: 1 },
        book: { id: 1, name: 'Ephesians' },
    },
    {
        id: 2,
        title: 'Walking in Faith',
        subtitle: null,
        date: '2026-01-22',
        shortDescription: 'A sermon about faith',
        bannerUrl: null,
        speaker: { id: 2, name: 'Jane Doe' },
        series: { id: 2, title: 'Faith Series' },
        congregation: { id: 1 },
        book: null,
    },
];

describe('SermonGrid', () => {
    it('renders sermon cards with titles', () => {
        render(<SermonGrid sermons={mockSermons} onSermonClick={() => {}} />);

        expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
        expect(screen.getByText('Walking in Faith')).toBeInTheDocument();
    });

    it('displays speaker names', () => {
        render(<SermonGrid sermons={mockSermons} onSermonClick={() => {}} />);

        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('shows empty state when no sermons', () => {
        render(<SermonGrid sermons={[]} onSermonClick={() => {}} />);

        expect(screen.getByText('No sermons found.')).toBeInTheDocument();
    });

    it('calls onSermonClick with sermon ID', async () => {
        const onClick = vi.fn();

        render(<SermonGrid sermons={mockSermons} onSermonClick={onClick} />);

        // Click the first sermon card
        await userEvent.click(screen.getByText('Amazing Grace'));

        expect(onClick).toHaveBeenCalledWith(1);
    });
});
```

- [ ] **Step 3: Run component tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=widget-sermons`
Expected: All tests pass including new component test.

- [ ] **Step 4: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add packages/widget-sermons/src/__tests__/components/
git commit -m "test: add SermonGrid component render tests"
```

---

## Chunk 4: Docs Update

### Task 7: Rewrite shared-package.md

**Files:**

- Modify: `docs/architecture/shared-package.md`

- [ ] **Step 1: Rewrite the docs to match actual code**

Replace the full content of `docs/architecture/shared-package.md`. The rewrite must:

1. Replace the exports block with actual `index.ts` exports (including `createApiError`, `WidgetErrorBoundary`, `PortalContainerProvider`, `usePortalContainer`)
2. Replace the API Client section — document `openapi-fetch` wrapper pattern, not fictional `get<T>()`/`post<T>()` methods. Show actual usage: `client.GET('/api/sermons', { params: { query: {...} } })`
3. Replace the Components section — list actual categories: base UI (Input, Button, Dialog, Textarea), perimeter components (Badge, Card, Calendar, Combobox, Dialog, Pagination, Skeleton, Spinner, Tabs, etc.), motion components (via `./components` re-export), utility (`cn`)
4. Fix Styles section — reference `base.css` not `tokens.css`
5. Add PortalContainerProvider/usePortalContainer documentation
6. Add createApiError documentation
7. Add WidgetErrorBoundary documentation
8. Update "Last verified" date to 2026-04-08

- [ ] **Step 2: Verify doc links are valid**

Check that all referenced files exist:
Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && ls docs/architecture/overview.md docs/reference/design-tokens.md docs/guides/testing.md`
Expected: All files exist.

- [ ] **Step 3: Run format check on docs**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm prettier --write docs/architecture/shared-package.md`

- [ ] **Step 4: Full quality check**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: All checks pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git add docs/architecture/shared-package.md
git commit -m "docs: rewrite shared-package.md to match actual code"
```

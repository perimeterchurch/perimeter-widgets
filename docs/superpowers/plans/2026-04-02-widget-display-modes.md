# Widget Display Modes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add display modes (full/compact/headless), tab locking, and locked filter params to the sermons widget via data-\* attributes.

**Architecture:** Expand `SermonsConfigSchema` with new Zod fields. `useSermonFilters` uses "always register, override on return" pattern — nuqs registers all params but locked values are overridden from config. View components conditionally render chrome based on `config.display`. Locked filters are invisible to the user.

**Tech Stack:** React, Zod, nuqs, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-04-02-widget-display-modes-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/widget-sermons/src/types.ts` | Modify | Expand `SermonsConfigSchema` with new fields + refine validation |
| `packages/widget-sermons/src/hooks/use-sermon-filters.ts` | Modify | Accept config, override locked values, no-op locked setters |
| `packages/widget-sermons/src/App.tsx` | Modify | Conditionally render tabs based on config |
| `packages/widget-sermons/src/components/sermons/SermonsView.tsx` | Modify | Display mode chrome control, locked filter merge |
| `packages/widget-sermons/src/components/series/SeriesView.tsx` | Modify | Display mode chrome control |
| `packages/widget-sermons/src/components/sermons/SermonFilters.tsx` | Modify | Hide locked filter dropdowns/chips |
| `packages/widget-sermons/src/components/sermons/SermonDetail.tsx` | Modify | Hide "More from series" in headless |
| `packages/storyboard/src/registry.ts` | Modify | Add config fields for new params |
| `packages/widget-sermons/src/__tests__/types.test.ts` | Modify | Test new config schema fields + validation |
| `packages/widget-sermons/src/__tests__/use-sermon-filters.test.ts` | Create | Test locked value overrides and no-op setters |

---

## Task 1: Expand SermonsConfigSchema

**Files:**
- Modify: `packages/widget-sermons/src/types.ts:8-14`
- Modify: `packages/widget-sermons/src/__tests__/types.test.ts`

- [ ] **Step 1: Write failing tests for new config fields**

Add to `packages/widget-sermons/src/__tests__/types.test.ts`:

```typescript
describe('SermonsConfigSchema — display modes', () => {
    it('accepts tab lock', () => {
        const result = SermonsConfigSchema.parse({ tab: 'sermons' });
        expect(result.tab).toBe('sermons');
    });

    it('accepts display mode', () => {
        const result = SermonsConfigSchema.parse({ display: 'compact' });
        expect(result.display).toBe('compact');
    });

    it('defaults display to full', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result.display).toBe('full');
    });

    it('accepts locked filter params', () => {
        const result = SermonsConfigSchema.parse({
            tab: 'sermons',
            seriesId: 945,
            speakerId: 7,
            bookId: 22,
            serviceTypeId: '1,3',
            from: '2025-01-01',
            to: '2025-12-31',
        });
        expect(result.seriesId).toBe(945);
        expect(result.serviceTypeId).toBe('1,3');
    });

    it('coerces serviceTypeId from number to string', () => {
        const result = SermonsConfigSchema.parse({ serviceTypeId: 42 });
        expect(result.serviceTypeId).toBe('42');
    });

    it('rejects sermon-only filters when tab is series', () => {
        expect(() =>
            SermonsConfigSchema.parse({ tab: 'series', speakerId: 7 }),
        ).toThrow();
    });

    it('allows sermon-only filters when tab is sermons', () => {
        const result = SermonsConfigSchema.parse({ tab: 'sermons', speakerId: 7 });
        expect(result.speakerId).toBe(7);
    });

    it('allows sermon-only filters when no tab is set', () => {
        const result = SermonsConfigSchema.parse({ seriesId: 945 });
        expect(result.seriesId).toBe(945);
    });

    it('rejects invalid date format', () => {
        expect(() =>
            SermonsConfigSchema.parse({ from: '01-01-2025' }),
        ).toThrow();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/widget-sermons && pnpm test`
Expected: New tests fail (schema doesn't have the new fields yet)

- [ ] **Step 3: Implement schema changes**

Update `SermonsConfigSchema` in `packages/widget-sermons/src/types.ts`:

```typescript
export const SermonsConfigSchema = z
    .object({
        // Existing
        serviceTypes: z.string().optional(),
        perPage: z.number().default(12),
        defaultTab: z.enum(['sermons', 'series']).default('sermons'),
        defaultView: z.enum(['grid', 'list', 'large']).default('grid'),
        apiUrl: z.string().optional(),
        // New — display and tab lock
        tab: z.enum(['sermons', 'series']).optional(),
        display: z.enum(['full', 'compact', 'headless']).default('full'),
        // New — locked filters (sermons tab only)
        seriesId: z.coerce.number().int().positive().optional(),
        speakerId: z.coerce.number().int().positive().optional(),
        bookId: z.coerce.number().int().positive().optional(),
        serviceTypeId: z.coerce.string().optional(),
        from: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
            .optional(),
        to: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
            .optional(),
    })
    .refine(
        (c) => {
            if (c.tab !== 'series') return true;
            return (
                !c.seriesId &&
                !c.speakerId &&
                !c.bookId &&
                !c.serviceTypeId &&
                !c.from &&
                !c.to
            );
        },
        {
            message:
                'Sermon-only filters (seriesId, speakerId, bookId, serviceTypeId, from, to) cannot be used with tab="series"',
        },
    );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/widget-sermons && pnpm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```
git add packages/widget-sermons/src/types.ts packages/widget-sermons/src/__tests__/types.test.ts
git commit -m "feat: expand SermonsConfigSchema with display modes and locked filters"
```

---

## Task 2: Update useSermonFilters for locked values

**Files:**
- Modify: `packages/widget-sermons/src/hooks/use-sermon-filters.ts`
- Create: `packages/widget-sermons/src/__tests__/use-sermon-filters.test.ts`

- [ ] **Step 1: Write failing tests for locked filter behavior**

Create `packages/widget-sermons/src/__tests__/use-sermon-filters.test.ts`. Note: nuqs requires `NuqsTestingAdapter` for testing. The hook returns locked values from config and no-op setters.

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useSermonFilters } from '../hooks/use-sermon-filters';
import type { SermonsConfig } from '../types';

function renderFilters(config: Partial<SermonsConfig> = {}) {
    const fullConfig: SermonsConfig = {
        perPage: 12,
        defaultTab: 'sermons',
        defaultView: 'grid',
        display: 'full',
        ...config,
    };
    return renderHook(() => useSermonFilters(fullConfig), {
        wrapper: ({ children }) => (
            <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
        ),
    });
}

describe('useSermonFilters', () => {
    it('returns default values without config locks', () => {
        const { result } = renderFilters();
        expect(result.current.tab).toBe('sermons');
        expect(result.current.sort).toBe('date');
    });

    it('returns locked tab from config', () => {
        const { result } = renderFilters({ tab: 'series' });
        expect(result.current.tab).toBe('series');
    });

    it('setTab is a no-op when tab is locked', () => {
        const { result } = renderFilters({ tab: 'sermons' });
        act(() => result.current.setTab('series'));
        expect(result.current.tab).toBe('sermons');
    });

    it('returns locked seriesId from config', () => {
        const { result } = renderFilters({ seriesId: 945 });
        expect(result.current.series).toBe(945);
    });

    it('setSeries is a no-op when seriesId is locked', () => {
        const { result } = renderFilters({ seriesId: 945 });
        act(() => result.current.setSeries(100));
        expect(result.current.series).toBe(945);
    });

    it('returns locked from/to from config', () => {
        const { result } = renderFilters({ from: '2025-01-01', to: '2025-12-31' });
        expect(result.current.from).toBe('2025-01-01');
        expect(result.current.to).toBe('2025-12-31');
    });

    it('hasActiveFilters excludes locked filters', () => {
        const { result } = renderFilters({ seriesId: 945 });
        expect(result.current.hasActiveFilters).toBe(false);
    });

    it('clearFilters does not clear locked values', () => {
        const { result } = renderFilters({ seriesId: 945 });
        act(() => result.current.setSpeaker(7));
        expect(result.current.hasActiveFilters).toBe(true);
        act(() => result.current.clearFilters());
        expect(result.current.series).toBe(945);
        expect(result.current.speaker).toBeNull();
    });

    it('uses defaultTab for initial tab value', () => {
        const { result } = renderFilters({ defaultTab: 'series' });
        expect(result.current.tab).toBe('series');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/widget-sermons && pnpm test`
Expected: Fails — `useSermonFilters` does not accept config param yet

- [ ] **Step 3: Implement useSermonFilters changes**

Update `packages/widget-sermons/src/hooks/use-sermon-filters.ts`:

The hook signature changes from `useSermonFilters()` to `useSermonFilters(config: SermonsConfig)`. It always registers all nuqs params but overrides return values and setters for locked params.

Key changes:
- Accept `config` parameter
- Build `tab` parser with `.withDefault(config.defaultTab)` for dynamic default
- After `useQueryStates`, override return values: e.g., `const tab = config.tab ?? params.tab`
- Make setters no-ops for locked values: e.g., `const setTab = config.tab ? () => {} : (tab: TabId) => setParams({...})`
- `hasActiveFilters` only counts unlocked params
- `clearFilters` only clears unlocked params
- `setSermonFromSeries` and `setSeriesDetail` respect locked tab

- [ ] **Step 4: Update App.tsx to pass config to useSermonFilters**

In `packages/widget-sermons/src/App.tsx`, change:
```typescript
const filters = useSermonFilters();
```
to:
```typescript
const filters = useSermonFilters(config);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/widget-sermons && pnpm test`
Expected: All tests pass

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: All packages pass (callers of useSermonFilters now need to pass config)

- [ ] **Step 7: Commit**

```
git add packages/widget-sermons/src/hooks/use-sermon-filters.ts packages/widget-sermons/src/__tests__/use-sermon-filters.test.ts packages/widget-sermons/src/App.tsx
git commit -m "feat: useSermonFilters supports locked config values"
```

---

## Task 3: Tab locking and display modes in App.tsx

**Files:**
- Modify: `packages/widget-sermons/src/App.tsx`

- [ ] **Step 1: Implement conditional tab rendering**

In `App.tsx`, update `renderContent()` to conditionally skip `SermonTabs`:

```typescript
const showTabs = !config.tab && config.display !== 'headless';
```

In the browse-mode return, wrap `SermonTabs` in the condition:

```typescript
return (
    <>
        {showTabs && (
            <SermonTabs
                activeTab={filters.tab}
                onTabChange={filters.setTab}
            />
        )}
        <div className={showTabs ? 'mt-4' : ''}>
            ...
        </div>
    </>
);
```

- [ ] **Step 2: Pass config to view components**

`SermonsView` and `SeriesView` already receive `config` — no changes needed. They'll read `config.display` themselves.

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm typecheck && cd packages/widget-sermons && pnpm test`
Expected: All pass

- [ ] **Step 4: Commit**

```
git add packages/widget-sermons/src/App.tsx
git commit -m "feat: conditional tab rendering based on config.tab and config.display"
```

---

## Task 4: Display modes in SermonsView

**Files:**
- Modify: `packages/widget-sermons/src/components/sermons/SermonsView.tsx`
- Modify: `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`

- [ ] **Step 1: Add display mode logic to SermonsView**

In `SermonsView`, read `config.display` and conditionally render:

```typescript
const showFilters = config.display === 'full';
const showSortView = config.display !== 'headless';
```

Wrap `<SermonFilters>` in `{showFilters && ...}`.
Wrap the sort/view controls `<div>` in `{showSortView && ...}`.

- [ ] **Step 2: Build locked filters set and pass to SermonFilters**

In `SermonsView`, compute which filters are locked:

```typescript
const lockedFilters = new Set<string>();
if (config.seriesId) lockedFilters.add('series');
if (config.speakerId) lockedFilters.add('speaker');
if (config.bookId) lockedFilters.add('book');
if (config.serviceTypeId) lockedFilters.add('serviceTypes');
if (config.from) lockedFilters.add('from');
if (config.to) lockedFilters.add('to');
```

Pass `lockedFilters` to `<SermonFilters lockedFilters={lockedFilters} ... />`.

- [ ] **Step 3: Update service type ID merge order in SermonsView**

Update the service type resolution logic to implement the priority:
`config.serviceTypeId` > `selectedServiceTypeIds` > `resolveServiceTypeIds(config.serviceTypes)`

```typescript
const resolvedServiceTypeId =
    config.serviceTypeId ??
    (filters.selectedServiceTypeIds.length > 0
        ? filters.selectedServiceTypeIds.join(',')
        : resolveServiceTypeIds(config.serviceTypes, serviceTypes) ?? undefined);
```

Remove the existing `configServiceTypeIds` and `resolvedServiceTypeId` logic in `useSermons` call and pass `serviceTypeId: resolvedServiceTypeId` directly.

- [ ] **Step 4: Update SermonFilters to respect lockedFilters**

In `SermonFilters`, add `lockedFilters: Set<string>` to the props interface.

For each filter section, wrap in `{!lockedFilters.has('series') && ...}`, etc.

In the active filter chips section, skip chips for locked filters.

In `hasActiveFilters` (passed as prop), the parent already computes this from `useSermonFilters` which excludes locked filters.

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm typecheck && cd packages/widget-sermons && pnpm test`
Expected: All pass

- [ ] **Step 6: Commit**

```
git add packages/widget-sermons/src/components/sermons/SermonsView.tsx packages/widget-sermons/src/components/sermons/SermonFilters.tsx
git commit -m "feat: display modes and locked filters in SermonsView"
```

---

## Task 5: Display modes in SeriesView and SermonDetail

**Files:**
- Modify: `packages/widget-sermons/src/components/series/SeriesView.tsx`
- Modify: `packages/widget-sermons/src/components/sermons/SermonDetail.tsx`

- [ ] **Step 1: Add display mode logic to SeriesView**

Read `config.display` and conditionally render:
- `full`: show search, date range, sort, view (current)
- `compact`: hide search and date range (InputGroup, DateRangePicker, Clear All)
- `headless`: hide all controls except grid and pagination

```typescript
const showSearch = config.display === 'full';
const showSortView = config.display !== 'headless';
```

Wrap search InputGroup in `{showSearch && ...}`.
Wrap date range row in `{showSearch && ...}`.
Wrap sort/view controls in `{showSortView && ...}`.

- [ ] **Step 2: Add display mode to SermonDetail**

In `SermonDetail`, read config and conditionally hide "More from this series":

```typescript
const showRelated = config.display !== 'headless';
```

Wrap the related sermons section in `{showRelated && relatedSermons.length > 0 && ...}`.

SermonDetail currently receives `config` as a prop, so no prop changes needed.

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm typecheck && cd packages/widget-sermons && pnpm test`
Expected: All pass

- [ ] **Step 4: Commit**

```
git add packages/widget-sermons/src/components/series/SeriesView.tsx packages/widget-sermons/src/components/sermons/SermonDetail.tsx
git commit -m "feat: display modes in SeriesView and SermonDetail"
```

---

## Task 6: Storyboard registry and build

**Files:**
- Modify: `packages/storyboard/src/registry.ts`

- [ ] **Step 1: Add config fields to storyboard registry**

Add new config fields to the sermons widget definition:

```typescript
{
    key: 'tab',
    label: 'Tab Lock',
    type: 'select',
    defaultValue: '',
    options: [
        { label: 'Both (default)', value: '' },
        { label: 'Sermons only', value: 'sermons' },
        { label: 'Series only', value: 'series' },
    ],
    description: 'Lock to a single tab and hide the tab switcher',
},
{
    key: 'display',
    label: 'Display Mode',
    type: 'select',
    defaultValue: 'full',
    options: [
        { label: 'Full', value: 'full' },
        { label: 'Compact', value: 'compact' },
        { label: 'Headless', value: 'headless' },
    ],
    description: 'Controls chrome level: full (all UI), compact (sort/view/grid/pagination), headless (grid/pagination only)',
},
{
    key: 'seriesId',
    label: 'Lock Series ID',
    type: 'number',
    defaultValue: '',
    description: 'Lock to a specific series (sermons tab only)',
},
{
    key: 'speakerId',
    label: 'Lock Speaker ID',
    type: 'number',
    defaultValue: '',
    description: 'Lock to a specific speaker (sermons tab only)',
},
{
    key: 'bookId',
    label: 'Lock Book ID',
    type: 'number',
    defaultValue: '',
    description: 'Lock to a specific book (sermons tab only)',
},
{
    key: 'serviceTypeId',
    label: 'Lock Service Type IDs',
    type: 'text',
    defaultValue: '',
    description: 'Comma-separated service type IDs to lock (sermons tab only)',
},
{
    key: 'from',
    label: 'Lock Start Date',
    type: 'text',
    defaultValue: '',
    description: 'Lock start date YYYY-MM-DD (sermons tab only)',
},
{
    key: 'to',
    label: 'Lock End Date',
    type: 'text',
    defaultValue: '',
    description: 'Lock end date YYYY-MM-DD (sermons tab only)',
},
```

- [ ] **Step 2: Build and verify storyboard renders**

Run: `pnpm build && pnpm typecheck`
Expected: All pass

- [ ] **Step 3: Commit**

```
git add packages/storyboard/src/registry.ts dist/
git commit -m "feat: add display mode and locked filter config to storyboard"
```

---

## Task 7: Final integration test and push

- [ ] **Step 1: Run full quality checks**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: All pass, all tests green, build succeeds

- [ ] **Step 2: Push and update PR**

```
git push
```

Update PR description to include the new display modes and locked filter features.

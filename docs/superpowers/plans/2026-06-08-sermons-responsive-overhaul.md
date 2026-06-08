# Sermons Responsive Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sermons widget render and read well on phones and tablets, and make the studio's Mobile/Tablet viewport presets simulate realistic phone/tablet host widths.

**Architecture:** Responsive behavior is container-query-driven (the widget can be embedded at any width). One JS exception — the default *view mode* selects a different render branch, so it's resolved from a `useContainerBreakpoint` (ResizeObserver) hook. The studio preview crush is fixed by making `HostFrame`'s gutter ramp with the frame width. New shared pieces: a `compact` prop on `SortSelect`/`IconSelect`, and a `CollapsibleFilters` wrapper.

**Tech Stack:** React 19, TypeScript, Tailwind v4 container queries (`@[30rem]:`/`@[48rem]:`), nuqs (URL state), Vitest + Testing Library, Playwright (studio visual harness).

**Spec:** `docs/superpowers/specs/2026-06-08-sermons-responsive-overhaul-design.md`

**Conventions:**
- Branch `feat/sermons-responsive-overhaul` (already created off `origin/dev`). Never commit to `dev`/`main`.
- Run a single test file with `pnpm --filter <pkg> exec vitest run <path>` (pkgs: `@perimeter/widget-sermons`, `@perimeter/ui`, `@perimeter/studio`). If a package lacks a local vitest binary, use `pnpm --filter <pkg> test`.
- Run `pnpm format` before any `pnpm quality`. The Playwright harness (`pnpm --filter @perimeter/studio visual`) is run by the **main agent only**, never inside workflow subagents.
- Breakpoint thresholds in JS MUST match the CSS container breakpoints: phone `< 480px` (30rem), tablet `480–767px`, desktop `≥ 768px` (48rem).

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `studio/src/lib/host-gutter.ts` | Pure `hostFrameGutter(frameWidth?)` ramp function | Create |
| `studio/src/components/HostFrame.tsx` | Accept `frameWidth?`, apply ramped gutter | Modify |
| `studio/src/components/Canvas.tsx` | Pass `resolvedPx` → `HostFrame frameWidth` | Modify |
| `packages/ui/src/sort-select.tsx` | Optional `compact` prop (icon + value, no `Sort by:`) | Modify |
| `packages/ui/src/icon-select.tsx` | Optional `compact` prop (icon + value, no label) | Modify |
| `widgets/sermons/src/lib/breakpoint.ts` | Pure `bucketFor(width)` + `ContainerBreakpoint` type | Create |
| `widgets/sermons/src/hooks/use-container-breakpoint.ts` | ResizeObserver hook over a ref | Create |
| `widgets/sermons/src/hooks/use-sermon-filters.ts` | Nullable `view`, `effectiveView`, `activeFilterCount` | Modify |
| `widgets/sermons/src/App.tsx` | Attach container ref, derive breakpoint, thread it | Modify |
| `widgets/sermons/src/components/ui/CollapsibleFilters.tsx` | Phone collapsible wrapper (toggle + badge + body) | Create |
| `widgets/sermons/src/components/sermons/SermonFilters.tsx` | Wrap rows 2–3 in `CollapsibleFilters` | Modify |
| `widgets/sermons/src/components/series/SeriesView.tsx` | Wrap its inline filter rows in `CollapsibleFilters` | Modify |
| `widgets/sermons/src/components/ui/ResultsToolbar.tsx` | Pass `compact` to Sort/View at phone | Modify |
| `widgets/sermons/src/components/sermons/SermonsView.tsx` / `series/SeriesView.tsx` | Accept + thread `breakpoint` | Modify |
| `studio/visual/sermons-responsive.spec.ts` | Visual regression at phone/tablet/desktop | Create |
| Component docs `docs/components/sort-select.mdx`, `icon-select.mdx` | Document the `compact` prop | Modify |

---

## Chunk 1: Studio preview fidelity (HostFrame responsive gutter)

This chunk is self-contained and ships an immediately visible improvement: the studio Mobile/Tablet presets stop crushing the widget. No widget code changes here.

### Task 1: `hostFrameGutter` ramp function

**Files:**
- Create: `studio/src/lib/host-gutter.ts`
- Test: `studio/src/lib/host-gutter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// studio/src/lib/host-gutter.test.ts
import { describe, it, expect } from 'vitest';
import { hostFrameGutter } from './host-gutter';

describe('hostFrameGutter', () => {
  it('returns the desktop gutter (90) when frame width is unknown (fluid)', () => {
    expect(hostFrameGutter(undefined)).toBe(90);
  });
  it('floors at 16px for phone-width frames (<= 640)', () => {
    expect(hostFrameGutter(375)).toBe(16);
    expect(hostFrameGutter(640)).toBe(16);
  });
  it('caps at 90px for desktop-width frames (>= 1200)', () => {
    expect(hostFrameGutter(1200)).toBe(90);
    expect(hostFrameGutter(1920)).toBe(90);
  });
  it('ramps linearly between 640 and 1200 (tablet ~33 at 768)', () => {
    expect(hostFrameGutter(768)).toBe(33);
  });
  it('produces realistic widget widths at the studio presets', () => {
    expect(375 - 2 * hostFrameGutter(375)).toBe(343); // Mobile → phone bucket (<480)
    expect(768 - 2 * hostFrameGutter(768)).toBe(702); // Tablet → tablet bucket (480–767)
    expect(1280 - 2 * hostFrameGutter(1280)).toBe(1100); // Desktop → desktop bucket (>=768)
  });
});
```

- [ ] **Step 2: Run it; expect FAIL** (`hostFrameGutter` not defined)

Run: `pnpm --filter @perimeter/studio exec vitest run src/lib/host-gutter.test.ts`

- [ ] **Step 3: Implement**

```ts
// studio/src/lib/host-gutter.ts
/**
 * Per-side horizontal gutter for the studio HostFrame, ramped to the canvas
 * frame width so narrow presets simulate a real responsive host (a phone page
 * has a small gutter, not the 90px desktop one). Linear from a 16px floor at
 * frames <= 640px to the 90px desktop gutter at frames >= 1200px. Undefined
 * frame width (fluid preset) keeps the desktop gutter — current behavior.
 */
export function hostFrameGutter(frameWidth: number | undefined): number {
  const MIN = 16;
  const MAX = 90; // mirrors hostProfile.contentPaddingX
  const LO = 640;
  const HI = 1200;
  if (frameWidth == null) return MAX;
  if (frameWidth <= LO) return MIN;
  if (frameWidth >= HI) return MAX;
  const t = (frameWidth - LO) / (HI - LO);
  return Math.round(MIN + t * (MAX - MIN));
}
```

- [ ] **Step 4: Run it; expect PASS**

Run: `pnpm --filter @perimeter/studio exec vitest run src/lib/host-gutter.test.ts`

- [ ] **Step 5: Commit**

```bash
git add studio/src/lib/host-gutter.ts studio/src/lib/host-gutter.test.ts
git commit -m "feat(studio): add responsive HostFrame gutter ramp"
```

### Task 2: HostFrame accepts `frameWidth`; Canvas passes it

**Files:**
- Modify: `studio/src/components/HostFrame.tsx`
- Modify: `studio/src/components/Canvas.tsx:374-385` (the `data-canvas-frame` block)

- [ ] **Step 1: Update HostFrame**

Add a `frameWidth?: number` prop and use `hostFrameGutter`. Replace the fixed `padding: 0 ${hostProfile.contentPaddingX}` with the ramped value. Full new file:

```tsx
// studio/src/components/HostFrame.tsx
import type { ReactNode } from 'react';
import { hostProfile } from '@perimeter/theme';
import { hostFrameGutter } from '../lib/host-gutter';

/**
 * Replicates the production host page around a widget preview: the inheritable
 * properties that pierce the shadow root plus the real content-frame width.
 * The horizontal gutter ramps with `frameWidth` (the resolved canvas frame
 * width) so the Mobile/Tablet presets simulate a realistic phone/tablet host
 * instead of crushing the widget with the 90px desktop gutter. When `frameWidth`
 * is undefined (fluid preset), the desktop gutter is kept.
 */
export function HostFrame({
  children,
  frameWidth,
}: {
  children: ReactNode;
  frameWidth?: number;
}) {
  const gutter = hostFrameGutter(frameWidth);
  return (
    <div
      data-host-frame
      style={{
        fontFamily: hostProfile.bodyFontFamily,
        fontSize: hostProfile.bodyFontSize,
        lineHeight: hostProfile.bodyLineHeight,
        color: hostProfile.bodyColor,
        background: hostProfile.bodyBackground,
      }}
    >
      <div
        style={{
          maxWidth: hostProfile.contentMaxWidth,
          margin: '0 auto',
          padding: `0 ${gutter}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Canvas passes `resolvedPx`**

In `studio/src/components/Canvas.tsx`, `resolvedPx` (line ~198) is `number | null`. Update the HostFrame usage (line ~381) to pass it as `frameWidth` (coerce `null` → `undefined`):

```tsx
) : hostSim ? (
  <HostFrame frameWidth={resolvedPx ?? undefined}>{children}</HostFrame>
) : (
```

- [ ] **Step 3: Typecheck + existing studio tests still pass**

Run: `pnpm exec turbo run typecheck --filter=@perimeter/studio --force`
Run: `pnpm --filter @perimeter/studio exec vitest run`
Expected: PASS (no studio unit test asserts the old fixed padding; if one does, update it to the ramped value).

- [ ] **Step 4: Commit**

```bash
git add studio/src/components/HostFrame.tsx studio/src/components/Canvas.tsx
git commit -m "feat(studio): ramp HostFrame gutter from the resolved frame width"
```

### Task 3: Visual regression — presets yield realistic widths

**Files:**
- Create: `studio/visual/sermons-responsive.spec.ts` (first test only; more added in Task 13)

- [ ] **Step 1: Write the visual test**

```ts
// studio/visual/sermons-responsive.spec.ts
import { test, expect } from '@playwright/test';
import { STUDIO_URL, mockSermonsApi, waitForShadowMount, waitForSermonCards } from './helpers';

async function containerWidth(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const sr = (document.querySelector('[data-perimeter-widget-preview]') as HTMLElement)?.shadowRoot;
    return (sr?.querySelector('[class~="@container"]') as HTMLElement | null)?.clientWidth ?? 0;
  });
}
async function selectPreset(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('group', { name: 'Viewport width presets' }).getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(400);
}

test.describe('studio preset fidelity (HostFrame gutter)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);
    await waitForSermonCards(page, 3);
  });

  test('Mobile preset yields a realistic phone-width container (not crushed to ~195)', async ({ page }) => {
    await selectPreset(page, 'Mobile');
    const w = await containerWidth(page);
    expect(w, `mobile container width ${w}`).toBeGreaterThan(320);
    expect(w, `mobile container width ${w}`).toBeLessThan(480);
  });

  test('Tablet preset yields a tablet-bucket width (480–767)', async ({ page }) => {
    await selectPreset(page, 'Tablet');
    const w = await containerWidth(page);
    expect(w).toBeGreaterThanOrEqual(480);
    expect(w).toBeLessThan(768);
  });
});
```

- [ ] **Step 2: Run (main agent only)**

Run: `pnpm --filter @perimeter/studio exec playwright test sermons-responsive.spec.ts --reporter=line`
Expected: PASS (the gutter fix makes Mobile ~343, Tablet ~702).

- [ ] **Step 3: Commit**

```bash
git add studio/visual/sermons-responsive.spec.ts
git commit -m "test(studio): assert presets yield realistic widget widths"
```

---

## Chunk 2: Shared `compact` dropdowns (`@perimeter/ui`)

`SortSelect` and `IconSelect` gain an opt-in `compact` that hides the textual prefix (`Sort by:` / the `label`). Default is the current behavior, so the standalone `SortSelect` in `SermonDetail` and the component-doc galleries are unaffected.

### Task 4: `SortSelect` compact prop

**Files:**
- Modify: `packages/ui/src/sort-select.tsx:43-58` (the trigger button)
- Test: `packages/ui/tests/sort-select.test.tsx` (create if absent; otherwise add a case)

- [ ] **Step 1: Failing test**

```tsx
// packages/ui/tests/sort-select.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { SortSelect } from '../src/sort-select';

const fields = [{ value: 'date', label: 'Date', icon: null }];
const noop = () => {};

describe('SortSelect compact', () => {
  it('shows the "Sort by:" prefix by default', () => {
    const { container } = render(
      <SortSelect sortField="date" sortDirection="desc" fields={fields} onSortFieldChange={noop} onSortDirectionChange={noop} />,
    );
    expect(within(container).getByText(/Sort by:/)).toBeTruthy();
  });
  it('drops the prefix when compact (icon + value only)', () => {
    const { container } = render(
      <SortSelect compact sortField="date" sortDirection="desc" fields={fields} onSortFieldChange={noop} onSortDirectionChange={noop} />,
    );
    expect(within(container).queryByText(/Sort by:/)).toBeNull();
    expect(within(container).getByText('Date')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run; expect FAIL**

Run: `pnpm --filter @perimeter/ui exec vitest run tests/sort-select.test.tsx`

- [ ] **Step 3: Implement** — add `compact?: boolean` to `SortSelectProps`, accept it in the function, and make the trigger label conditional:

```tsx
// in SortSelectProps:
  compact?: boolean;
// in the destructure: add `compact = false,`
// replace the trigger's label span:
        <span className="min-w-0 truncate">
          {!compact && 'Sort by: '}
          <span className="font-medium text-fg">{activeField?.label ?? sortField}</span>
        </span>
```

- [ ] **Step 4: Run; expect PASS**

Run: `pnpm --filter @perimeter/ui exec vitest run tests/sort-select.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/sort-select.tsx packages/ui/tests/sort-select.test.tsx
git commit -m "feat(ui): SortSelect compact prop (icon + value, no prefix)"
```

### Task 5: `IconSelect` compact prop

**Files:**
- Modify: `packages/ui/src/icon-select.tsx:13-48`
- Test: `packages/ui/tests/icon-select.test.tsx` (create/add)

- [ ] **Step 1: Failing test** — render with `label="View:"` + an option; assert the `View:` text is present normally and absent when `compact`, while the active value (`Grid`) shows in both.

```tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { IconSelect } from '../src/icon-select';

const options = [{ value: 'grid', label: 'Grid', icon: null }];
describe('IconSelect compact', () => {
  it('shows the label prefix by default', () => {
    const { container } = render(<IconSelect label="View:" icon={null} value="grid" options={options} onChange={() => {}} />);
    expect(within(container).getByText(/View:/)).toBeTruthy();
  });
  it('hides the label prefix when compact (value still shows)', () => {
    const { container } = render(<IconSelect compact label="View:" icon={null} value="grid" options={options} onChange={() => {}} />);
    expect(within(container).queryByText(/View:/)).toBeNull();
    expect(within(container).getByText('Grid')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run; expect FAIL**

Run: `pnpm --filter @perimeter/ui exec vitest run tests/icon-select.test.tsx`

- [ ] **Step 3: Implement** — add `compact?: boolean` to `IconSelectProps`, destructure `compact = false`, and conditionally render the static `label`:

```tsx
        <span className="min-w-0 truncate">
          {!compact && <>{label} </>}
          <span className="font-medium text-fg">{activeOption?.label ?? value}</span>
        </span>
```

- [ ] **Step 4: Run; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/icon-select.tsx packages/ui/tests/icon-select.test.tsx
git commit -m "feat(ui): IconSelect compact prop (icon + value, no label)"
```

### Task 6: Document the `compact` prop

**Files:**
- Modify: `docs/components/sort-select.mdx`, `docs/components/icon-select.mdx` (Props tables)

- [ ] **Step 1:** Add a `| `compact` | `boolean` | `false` | Render icon + current value only (drop the textual prefix); used by responsive toolbars. |` row to each Props table.
- [ ] **Step 2: Validate via studio build**

Run: `pnpm --filter @perimeter/studio... build`
Expected: built OK (MDX compiles).

- [ ] **Step 3: Commit**

```bash
git add docs/components/sort-select.mdx docs/components/icon-select.mdx
git commit -m "docs: document SortSelect/IconSelect compact prop"
```

---

## Chunk 3: Container breakpoint + default-view contract

### Task 7: `bucketFor` + `useContainerBreakpoint`

**Files:**
- Create: `widgets/sermons/src/lib/breakpoint.ts`
- Create: `widgets/sermons/src/hooks/use-container-breakpoint.ts`
- Test: `widgets/sermons/tests/lib/breakpoint.test.ts`

- [ ] **Step 1: Failing test for the pure bucket function**

```ts
// widgets/sermons/tests/lib/breakpoint.test.ts
import { describe, it, expect } from 'vitest';
import { bucketFor } from '../../src/lib/breakpoint';

describe('bucketFor', () => {
  it('phone below 480px (30rem)', () => {
    expect(bucketFor(343)).toBe('phone');
    expect(bucketFor(479)).toBe('phone');
  });
  it('tablet in [480, 768)', () => {
    expect(bucketFor(480)).toBe('tablet');
    expect(bucketFor(702)).toBe('tablet');
    expect(bucketFor(767)).toBe('tablet');
  });
  it('desktop at >= 768px (48rem)', () => {
    expect(bucketFor(768)).toBe('desktop');
    expect(bucketFor(1100)).toBe('desktop');
  });
});
```

- [ ] **Step 2: Run; expect FAIL**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/lib/breakpoint.test.ts`

- [ ] **Step 3: Implement the pure module + the hook**

```ts
// widgets/sermons/src/lib/breakpoint.ts
export type ContainerBreakpoint = 'phone' | 'tablet' | 'desktop';

// Thresholds MUST match the CSS container breakpoints used in the grids:
// @[30rem] = 480px, @[48rem] = 768px.
const PHONE_MAX = 480;
const TABLET_MAX = 768;

export function bucketFor(width: number): ContainerBreakpoint {
  if (width < PHONE_MAX) return 'phone';
  if (width < TABLET_MAX) return 'tablet';
  return 'desktop';
}
```

```ts
// widgets/sermons/src/hooks/use-container-breakpoint.ts
import { useLayoutEffect, useState, type RefObject } from 'react';
import { bucketFor, type ContainerBreakpoint } from '../lib/breakpoint';

/**
 * Observe an element's inline size and return its container breakpoint
 * ('phone' | 'tablet' | 'desktop'). Used only where a *different render branch*
 * is needed (the default view mode + compact toolbar / collapsible filters);
 * column counts stay pure CSS container queries. State changes only when the
 * bucket crosses a threshold, so a stable width causes no re-render churn.
 * useLayoutEffect does the initial measure before paint, so the first paint is
 * already correct (no grid→list flash on phones).
 */
export function useContainerBreakpoint(ref: RefObject<HTMLElement | null>): ContainerBreakpoint {
  const [bp, setBp] = useState<ContainerBreakpoint>('desktop');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = bucketFor(el.clientWidth);
      setBp((prev) => (prev === next ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return bp;
}
```

- [ ] **Step 4: Run; expect PASS** (the pure test; the hook is exercised in App tests + the visual harness)

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/lib/breakpoint.test.ts`

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/lib/breakpoint.ts widgets/sermons/src/hooks/use-container-breakpoint.ts widgets/sermons/tests/lib/breakpoint.test.ts
git commit -m "feat(sermons): container-breakpoint hook + pure bucketFor"
```

### Task 8: Nullable `view`, `effectiveView`, `activeFilterCount` in `useSermonFilters`

**Files:**
- Modify: `widgets/sermons/src/hooks/use-sermon-filters.ts`
- Test: `widgets/sermons/tests/hooks/use-sermon-filters.test.tsx` (add cases)

- [ ] **Step 1: Add failing tests** (follow the existing test file's setup — it renders a component that calls the hook inside `NuqsAdapter`/`NuqsTestingAdapter`; mirror that harness). Add:

```tsx
// effectiveView: unset + phone → 'list'; unset + tablet/desktop → defaultView; explicit preserved on phone.
it('defaults view to list on phone when unset', () => {
  const { result } = renderFilters({ config: {}, breakpoint: 'phone' }); // helper passes options.breakpoint
  expect(result.view).toBe('list');
});
it('defaults view to grid (config default) on tablet/desktop when unset', () => {
  expect(renderFilters({ config: {}, breakpoint: 'tablet' }).view).toBe('grid');
  expect(renderFilters({ config: { defaultView: 'large' }, breakpoint: 'desktop' }).view).toBe('large');
});
it('preserves an explicit ?view= on phone', () => {
  expect(renderFilters({ config: {}, breakpoint: 'phone', searchParams: 'sermons-view=grid' }).view).toBe('grid');
});
// activeFilterCount: counts collapsible dims (date range = 1), excludes search + locked.
it('counts active collapsible filters, date range as one, excluding locked + search', () => {
  const r = renderFilters({ config: {}, searchParams: 'sermons-series=1,2&sermons-from=2026-01-01&sermons-to=2026-02-01&sermons-search=x' });
  expect(r.activeFilterCount).toBe(2); // series + date-range; search excluded
  expect(r.hasActiveFilters).toBe(true);
});
it('activeFilterCount never exceeds and never contradicts hasActiveFilters', () => {
  const r = renderFilters({ config: {}, searchParams: 'sermons-search=x' });
  expect(r.activeFilterCount).toBe(0);
  expect(r.hasActiveFilters).toBe(true); // search-only
});
```

> NOTE for the implementer: read the existing `use-sermon-filters.test.tsx` to reuse its exact render harness (how it provides nuqs search params and reads the returned object). Adapt `renderFilters` to that harness; add a `breakpoint` passthrough to the hook's options.

- [ ] **Step 2: Run; expect FAIL**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/hooks/use-sermon-filters.test.tsx`

- [ ] **Step 3: Implement**

In `use-sermon-filters.ts`:

a. Extend the options + import the type:
```ts
import type { ContainerBreakpoint } from '../lib/breakpoint';
export interface UseSermonFiltersOptions {
  prefix?: string | undefined;
  breakpoint?: ContainerBreakpoint | undefined;
}
// destructure: const { prefix, breakpoint } = options;
```

b. Make `view` nullable (line 57) — drop `.withDefault`; update the memo deps to `[defaultTab]` (view no longer references `defaultView` in the parser):
```ts
      view: parseAsStringLiteral(['grid', 'list', 'large'] as const),
```

c. Resolve the effective view (near the other return-overrides, after `params` is read):
```ts
  // Default view follows the container: phone → compact list, else the config
  // default ('grid'). An explicit choice (user click or ?view=) is a non-null
  // params.view and always wins, even on a phone.
  const effectiveView: ViewMode = params.view ?? (breakpoint === 'phone' ? 'list' : defaultView);
```

d. Replace the `hasActiveFilters` block (lines 221-229) with a count-first derivation (date range counts once; search excluded from the badge count):
```ts
  const collapsibleFilterActive = [
    !config.seriesId && selectedSeriesIds.length > 0,
    !config.speakerId && selectedSpeakerIds.length > 0,
    !config.bookId && selectedBookIds.length > 0,
    selectedServiceTypeIds.length > 0,
    !config.seriesTypeId && selectedSeriesTypeIds.length > 0,
    (!config.from && params.from !== null) || (!config.to && params.to !== null),
  ];
  const activeFilterCount = collapsibleFilterActive.filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || !!params.search;
```

e. Override `view` and expose `activeFilterCount` in the return (after `...params`, alongside `tab`/`from`/`to`):
```ts
  return {
    ...params,
    view: effectiveView,
    tab,
    from,
    to,
    // ...existing...
    hasActiveFilters,
    activeFilterCount,
    lockedFilters,
  };
```

- [ ] **Step 4: Run; expect PASS** (new + existing hook tests)

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/hooks/use-sermon-filters.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/hooks/use-sermon-filters.ts widgets/sermons/tests/hooks/use-sermon-filters.test.tsx
git commit -m "feat(sermons): nullable view + effectiveView default + activeFilterCount"
```

### Task 9: Wire the breakpoint in `SermonsWidget`

**Files:**
- Modify: `widgets/sermons/src/App.tsx:40-108`

- [ ] **Step 1:** In `SermonsWidget`, add a ref to the `@container` div, derive the breakpoint, pass it to the hook and thread it to the views.

```tsx
import { useContainerBreakpoint } from './hooks/use-container-breakpoint';
// ...
function SermonsWidget({ config }: SermonsWidgetProps): React.JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const breakpoint = useContainerBreakpoint(containerRef);
  const filters = useSermonFilters(config, { prefix: NUQS_PREFIX, breakpoint });
  // ...
  // pass breakpoint to the views:
  //   <SermonsView config={config} filters={filters} breakpoint={breakpoint} />
  //   <SeriesView config={config} filters={filters} breakpoint={breakpoint} />
  // ...
  return (
    <div ref={containerRef} className="@container p-4">
      {/* unchanged */}
    </div>
  );
}
```

- [ ] **Step 2: Thread the prop type** — add `breakpoint: ContainerBreakpoint` to `SermonsViewProps` and `SeriesViewProps` (import the type). Leave usage to Chunk 4 tasks.

- [ ] **Step 3: Typecheck** (will fail until views accept the prop — acceptable mid-task; or add the prop as optional first). To keep each commit green, make the view prop **required** and update both view call sites + prop types in this step so typecheck passes.

Run: `pnpm exec turbo run typecheck --filter=@perimeter/widget-sermons --force`
Expected: PASS.

- [ ] **Step 4: Run App tests**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/App.test.tsx`
Expected: PASS (App still renders; ResizeObserver may need a stub — see note).

> NOTE: jsdom/happy-dom may lack `ResizeObserver`. If `tests/App.test.tsx` or the per-view tests fail with `ResizeObserver is not defined`, add a minimal stub to `widgets/sermons/tests/setup.ts` (a class with `observe/unobserve/disconnect` no-ops). The hook falls back to the `'desktop'` initial state when the observer never fires, which is the correct default for layout-blind tests.

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/App.tsx widgets/sermons/src/components/sermons/SermonsView.tsx widgets/sermons/src/components/series/SeriesView.tsx widgets/sermons/tests/setup.ts
git commit -m "feat(sermons): derive container breakpoint and thread it to views"
```

---

## Chunk 4: Phone layout — collapsible filters + compact toolbar

### Task 10: `CollapsibleFilters` wrapper

**Files:**
- Create: `widgets/sermons/src/components/ui/CollapsibleFilters.tsx`
- Test: `widgets/sermons/tests/components/ui/CollapsibleFilters.test.tsx`

Behavior: on `phone`, render a `Filters` toggle button (with an `activeFilterCount` badge when > 0 and a `Clear` affordance when `onClear` given + `hasActive`) above a collapsible body that starts collapsed and toggles open. On `tablet`/`desktop`, render the body always-visible with no toggle.

- [ ] **Step 1: Failing test**

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { CollapsibleFilters } from '../../../src/components/ui/CollapsibleFilters';

const body = <div data-testid="body">filters</div>;

describe('CollapsibleFilters', () => {
  it('tablet/desktop: no toggle, body always visible', () => {
    const { container } = render(<CollapsibleFilters breakpoint="tablet" activeFilterCount={0} hasActive={false} onClear={vi.fn()}>{body}</CollapsibleFilters>);
    expect(within(container).queryByRole('button', { name: /filters/i })).toBeNull();
    expect(within(container).getByTestId('body')).toBeTruthy();
  });
  it('phone: body hidden until the Filters toggle is pressed', () => {
    const { container } = render(<CollapsibleFilters breakpoint="phone" activeFilterCount={0} hasActive={false} onClear={vi.fn()}>{body}</CollapsibleFilters>);
    const scope = within(container);
    expect(scope.queryByTestId('body')).toBeNull();
    fireEvent.click(scope.getByRole('button', { name: /filters/i }));
    expect(scope.getByTestId('body')).toBeTruthy();
  });
  it('phone: toggle shows the active-filter count badge', () => {
    const { container } = render(<CollapsibleFilters breakpoint="phone" activeFilterCount={2} hasActive onClear={vi.fn()}>{body}</CollapsibleFilters>);
    expect(within(container).getByText('2')).toBeTruthy();
  });
  it('phone: Clear calls onClear and is hidden when nothing active', () => {
    const onClear = vi.fn();
    const { container, rerender } = render(<CollapsibleFilters breakpoint="phone" activeFilterCount={0} hasActive={false} onClear={onClear}>{body}</CollapsibleFilters>);
    expect(within(container).queryByRole('button', { name: /clear/i })).toBeNull();
    rerender(<CollapsibleFilters breakpoint="phone" activeFilterCount={1} hasActive onClear={onClear}>{body}</CollapsibleFilters>);
    fireEvent.click(within(container).getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run; expect FAIL**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/components/ui/CollapsibleFilters.test.tsx`

- [ ] **Step 3: Implement** (token-based; `aria-expanded`/`aria-controls` on the toggle):

```tsx
// widgets/sermons/src/components/ui/CollapsibleFilters.tsx
import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import type { ContainerBreakpoint } from '../../lib/breakpoint';

interface Props {
  breakpoint: ContainerBreakpoint;
  activeFilterCount: number;
  hasActive: boolean;
  onClear: () => void;
  children: ReactNode;
}

/**
 * On phone, collapses its children (the filter dropdowns + date range) behind a
 * Filters toggle with an active-count badge + a Clear affordance, so the result
 * list is visible without scrolling past every control. On tablet/desktop the
 * children render inline with no toggle (always expanded).
 */
export function CollapsibleFilters({ breakpoint, activeFilterCount, hasActive, onClear, children }: Props) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  if (breakpoint !== 'phone') return <>{children}</>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
        <div className="flex-1" />
        {hasActive && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      {open && <div id={bodyId} className="space-y-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/components/ui/CollapsibleFilters.tsx widgets/sermons/tests/components/ui/CollapsibleFilters.test.tsx
git commit -m "feat(sermons): CollapsibleFilters wrapper (phone-only collapse)"
```

### Task 11: `SermonFilters` uses `CollapsibleFilters`

**Files:**
- Modify: `widgets/sermons/src/components/sermons/SermonFilters.tsx`
- Modify: `widgets/sermons/src/components/sermons/SermonsView.tsx` (pass `breakpoint` + `activeFilterCount`)
- Test: `widgets/sermons/tests/components/SermonFilters.test.tsx` (add a phone-collapse case)

- [ ] **Step 1:** Add `breakpoint: ContainerBreakpoint` and `activeFilterCount: number` to `SermonFiltersProps`. Wrap **Row 2 (dropdowns) + Row 3 (date range + Clear All)** in `<CollapsibleFilters breakpoint={...} activeFilterCount={...} hasActive={props.hasActiveFilters} onClear={props.onClearFilters}>`. Keep **Row 1 (search)** and the **active-filter chips** OUTSIDE the collapsible (always visible). When `breakpoint === 'phone'`, drop the in-body "Clear All" button (the collapsible header owns Clear) to avoid duplication — i.e., render that button only when `breakpoint !== 'phone'`.
- [ ] **Step 2:** In `SermonsView`, pass `breakpoint={breakpoint}` and `activeFilterCount={filters.activeFilterCount}` to `<SermonFilters .../>`.
- [ ] **Step 3: Failing→passing test** — render `SermonFilters` with `breakpoint="phone"`, `activeFilterCount={1}`, unlocked filters; assert the series dropdown (`All Series`) is hidden until the `Filters` toggle is clicked, and the search box is always present.
- [ ] **Step 4: Run**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/components/SermonFilters.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/components/sermons/SermonFilters.tsx widgets/sermons/src/components/sermons/SermonsView.tsx widgets/sermons/tests/components/SermonFilters.test.tsx
git commit -m "feat(sermons): collapse SermonFilters on phone"
```

### Task 12: `SeriesView` inline filters use `CollapsibleFilters`

**Files:**
- Modify: `widgets/sermons/src/components/series/SeriesView.tsx` (its inline filter rows, ~lines 120-170)

- [ ] **Step 1:** Wrap `SeriesView`'s inline dropdown row + date-range/clear row in `<CollapsibleFilters breakpoint={breakpoint} activeFilterCount={filters.activeFilterCount} hasActive={filters.hasActiveFilters} onClear={filters.clearFilters}>`, keeping the search input + chips outside. Mirror the phone "Clear All" de-duplication from Task 11.
- [ ] **Step 2: Run series-related tests** (results-states covers SeriesView):

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/results-states.test.tsx`
Expected: PASS (stub `filters.activeFilterCount` in that test's filters stub if it constructs one — search the file for the stub shape and add the field).

- [ ] **Step 3: Commit**

```bash
git add widgets/sermons/src/components/series/SeriesView.tsx widgets/sermons/tests/results-states.test.tsx
git commit -m "feat(sermons): collapse SeriesView filters on phone"
```

### Task 13: Compact Sort/View toolbar on phone

**Files:**
- Modify: `widgets/sermons/src/components/ui/ResultsToolbar.tsx`
- Modify: `widgets/sermons/src/components/sermons/SermonsView.tsx` + `series/SeriesView.tsx` (pass `breakpoint` to `ResultsToolbar`)
- Test: `widgets/sermons/tests/components/ResultsToolbar.test.tsx` (add)

- [ ] **Step 1:** Add `breakpoint: ContainerBreakpoint` to `ResultsToolbarProps`; pass `compact={breakpoint === 'phone'}` to both `<SortSelect>` and `<IconSelect>`.
- [ ] **Step 2:** Pass `breakpoint={breakpoint}` from `SermonsView`/`SeriesView` into `<ResultsToolbar .../>`.
- [ ] **Step 3: Test** — render `ResultsToolbar` with `breakpoint="phone"`; assert `Sort by:` / `View:` text is absent but the active values (e.g. `Date`) show; render with `breakpoint="tablet"` and assert the prefixes are present.
- [ ] **Step 4: Run**

Run: `pnpm --filter @perimeter/widget-sermons exec vitest run tests/components/ResultsToolbar.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add widgets/sermons/src/components/ui/ResultsToolbar.tsx widgets/sermons/src/components/sermons/SermonsView.tsx widgets/sermons/src/components/series/SeriesView.tsx widgets/sermons/tests/components/ResultsToolbar.test.tsx
git commit -m "feat(sermons): compact Sort/View dropdowns on phone"
```

---

## Chunk 5: End-to-end visual verification + gate

### Task 14: Responsive visual specs (phone/tablet/desktop)

**Files:**
- Modify: `studio/visual/sermons-responsive.spec.ts` (extend Task 3's file)

Add tests (use the realistic-surface method: switch the canvas "Surface" to `White` so the frame width == widget width, OR keep host-sim and rely on the Task-1 gutter; prefer host-sim now that the gutter is realistic). Assert at each preset:

- [ ] **Step 1: Phone (Mobile preset)** — defaults to the **list** layout (`SermonSmallList` renders its row container, not `.grid`), the **Filters toggle** is present and the dropdown row is collapsed (the `All Series` combobox not in the DOM until toggled), the Sort/View triggers do **not** contain `Sort by:` / `View:` text, and there is **no horizontal overflow** of the `@container` (scrollWidth ≤ clientWidth + 1).
- [ ] **Step 2: Tablet (Tablet preset)** — grid renders **2 columns** (assert the grid element's computed `grid-template-columns` has 2 tracks, or count cards-per-row by offsetTop grouping), filters are **inline** (no Filters toggle), Sort/View show full labels, no overflow.
- [ ] **Step 3: Desktop preset** — grid renders **3 columns**, no overflow.
- [ ] **Step 4: Date modal fits** — open the date-range picker at Mobile preset; assert the modal panel width ≤ container/viewport width (no horizontal overflow).
- [ ] **Step 5: Run the FULL harness (main agent only), with one retry**

Run: `pnpm --filter @perimeter/studio exec playwright test --reporter=line --retries=1`
Expected: all green (existing specs + the new responsive specs). Investigate any real failure; the known view-dropdown flake is already hardened (`openShadowMenu`).

- [ ] **Step 6: Commit**

```bash
git add studio/visual/sermons-responsive.spec.ts
git commit -m "test(studio): phone/tablet/desktop responsive visual specs"
```

### Task 15: Full quality gate + manual eyeball

- [ ] **Step 1:** `pnpm format`
- [ ] **Step 2:** `pnpm quality` — expect 0 failures across all packages.
- [ ] **Step 3:** Force-run the changed packages' gates to defeat turbo cache:

```bash
pnpm exec turbo run typecheck lint test --filter=@perimeter/widget-sermons --filter=@perimeter/ui --filter=@perimeter/studio --force
```

- [ ] **Step 4:** Capture before/after screenshots at Mobile + Tablet presets via the harness (`snapshotPreview`) and eyeball that: phone shows the compact list with collapsed filters and no clipping; tablet shows the 2-col grid with inline filters and full labels.
- [ ] **Step 5:** Open the PR to `dev` (body via the Write tool + `gh pr create --body-file`, per repo rules). Summarize: studio gutter fix, phone list-default + collapsible filters + compact toolbar, tablet/desktop unchanged, the default-view contract, and the visual verification.

---

## Notes / gotchas for the implementer

- **`ResizeObserver` in tests:** jsdom/happy-dom may not define it. If view/App tests throw `ResizeObserver is not defined`, add a no-op stub in `widgets/sermons/tests/setup.ts`. The hook's `'desktop'` initial state is the correct layout-blind default.
- **Date picker `size`:** `DateRangePopover` is a viewport-`fixed`, `w-full max-w-[...]` modal that already fits a phone — verify only. Its `size` (`sm`/`lg`) is chosen by `DateRangePicker`; if a `size='lg'` (two-month) layout is reachable on a phone and overflows, force `sm` at phone — but confirm it's actually reachable first (it likely isn't). Do NOT build an anchored popover.
- **Detail views:** `SermonDetail`/`SeriesDetail` are already single-column — verify they fit at phone width (watch the title + Copy-link header row in `SermonDetail`); no layout collapse needed.
- **`filters.view` is now resolved** — all consumers keep reading `filters.view`; it's never null. Don't reintroduce a `.withDefault` on the param.
- **Keep the studio chunk first** — it's independently shippable and makes every subsequent visual check realistic.

# Sermon Finder Widget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional sermon finder/viewer widget with search, filter, browse, and media playback capabilities embedded via shadow DOM on perimeter.org.

**Architecture:** Three-tab widget (Sermons | Series | Compilations) with hybrid query string state (nuqs) + React state. Fetches from public API at api.perimeter.org. Media players ported from perimeter-api helpdesk domain. New shared components (Tabs, Pagination, SearchInput, DateRangePicker) added to the shared package with Storybook stories.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, @tanstack/react-query, nuqs, Luxon, react-pdf, Headless UI, Framer Motion, Vite IIFE build, shadow DOM isolation.

**Spec:** `docs/superpowers/specs/2026-03-19-sermon-finder-widget-design.md`

---

## File Structure

### New files to create

**Shared package (`packages/shared/src/`):**

```
components/composite/Tabs.tsx              # Reusable tab bar
components/composite/Tabs.stories.tsx      # Storybook stories
components/composite/Pagination.tsx        # Numbered page buttons
components/composite/Pagination.stories.tsx
components/primitives/SearchInput.tsx      # Debounced search input
components/primitives/SearchInput.stories.tsx
components/composite/DateRangePicker.tsx   # From/to date inputs
components/composite/DateRangePicker.stories.tsx
```

**Widget sermons (`packages/widget-sermons/src/`):**

```
types.ts                                   # UPDATE: replace placeholder types with real API types
hooks/use-sermons.ts                       # React Query hook: paginated sermon list
hooks/use-sermon-detail.ts                 # React Query hook: single sermon
hooks/use-series.ts                        # React Query hook: series list
hooks/use-series-detail.ts                 # React Query hook: single series with sermons
hooks/use-speakers.ts                      # React Query hook: speakers list for filter
hooks/use-books.ts                         # React Query hook: books list for filter
hooks/use-sermon-filters.ts               # nuqs: all query string state
hooks/use-media-player.ts                  # Ported from helpdesk
components/SermonTabs.tsx                  # Top-level tab bar
components/sermons/SermonsView.tsx         # Sermons tab container
components/sermons/SermonFilters.tsx       # Filter bar with inline + expandable
components/sermons/SermonCardGrid.tsx      # Card grid view
components/sermons/SermonSmallList.tsx     # Compact list view
components/sermons/SermonLargeCards.tsx    # Large feature card view
components/sermons/SermonDetail.tsx        # Detail with tabbed player
components/series/SeriesView.tsx           # Series tab container
components/series/SeriesGrid.tsx           # Series card grid
components/series/SeriesDetail.tsx         # Series detail with sermon list
components/players/VideoPlayer.tsx         # Ported from helpdesk
components/players/AudioPlayer.tsx         # Ported from helpdesk
components/players/PdfViewer.tsx           # Ported from helpdesk
components/players/MediaTabs.tsx           # Tabbed Watch/Listen/PDF container
components/compilations/ComingSoon.tsx     # Placeholder
```

**Storyboard updates:**

```
packages/storyboard/src/registry.ts        # UPDATE: sermons entry
packages/storyboard/src/mocks/handlers.ts  # UPDATE: add missing endpoint handlers
packages/storyboard/src/mocks/data/sermons.ts  # UPDATE: real response shapes
```

### Files to modify

```
packages/widget-sermons/package.json       # Add nuqs, luxon, react-pdf, @types/luxon
packages/widget-sermons/src/App.tsx        # Replace placeholder with real widget
packages/widget-sermons/src/index.tsx      # May need minor updates
packages/shared/src/components/index.ts    # Export new shared components
docs/widgets/sermons.md                    # Update to reflect final architecture
```

---

## Chunk 1: Foundation — Dependencies, Types, and Shared Components

### Task 1: Install dependencies

**Files:**

- Modify: `packages/widget-sermons/package.json`

- [ ] **Step 1: Install nuqs, luxon, and react-pdf in widget-sermons**

```bash
cd packages/widget-sermons
pnpm add nuqs luxon react-pdf
# Note: Luxon 3.x ships its own TypeScript types — no @types/luxon needed
```

- [ ] **Step 2: Verify installation**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: No new type errors from the dependency additions.

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/package.json pnpm-lock.yaml
git commit -m "chore: add nuqs, luxon, react-pdf to widget-sermons"
```

---

### Task 2: Update types.ts with real API types

**Files:**

- Modify: `packages/widget-sermons/src/types.ts`

- [ ] **Step 1: Write the test for config schema validation**

Create `packages/widget-sermons/src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SermonsConfigSchema } from '../types';

describe('SermonsConfigSchema', () => {
    it('parses valid config with defaults', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result).toEqual({
            perPage: 12,
            defaultTab: 'sermons',
            defaultView: 'grid',
        });
    });

    it('parses config with campus as number', () => {
        const result = SermonsConfigSchema.parse({ campus: 1 });
        expect(result.campus).toBe(1);
    });

    it('accepts string campus for backwards compatibility', () => {
        const result = SermonsConfigSchema.parse({ campus: 'buckhead' });
        expect(result.campus).toBe('buckhead');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/widget-sermons && pnpm vitest run src/__tests__/types.test.ts
```

Expected: FAIL — schema doesn't have `defaultTab` or `defaultView` yet.

- [ ] **Step 3: Replace types.ts with real API types**

Replace the entire contents of `packages/widget-sermons/src/types.ts`:

```typescript
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Widget Configuration (from data-* attributes)                      */
/* ------------------------------------------------------------------ */

export const SermonsConfigSchema = z.object({
    campus: z.union([z.number(), z.string()]).optional(),
    perPage: z.number().default(12),
    defaultTab: z.enum(['sermons', 'series']).default('sermons'),
    defaultView: z.enum(['grid', 'list', 'large']).default('grid'),
    apiUrl: z.string().optional(),
});

export type SermonsConfig = z.infer<typeof SermonsConfigSchema>;

/* ------------------------------------------------------------------ */
/*  API Response Types                                                 */
/* ------------------------------------------------------------------ */

export type Speaker = {
    id: number;
    name: string;
    bio: string | null;
};

export type Book = {
    id: number;
    name: string;
};

export type SermonLink = {
    id: number;
    url: string;
    type: string;
    mediaType: 'video' | 'audio' | 'document';
    duration: string | null;
    position: number | null;
};

export type SermonListItem = {
    id: number;
    title: string;
    subtitle: string | null;
    shortDescription: string | null;
    date: string;
    bannerUrl: string | null;
    speaker: { id: number; name: string };
    series: { id: number; title: string };
    congregation: { id: number };
};

export type SermonDetail = SermonListItem & {
    description: string | null;
    transcript: string | null;
    scriptureLinks: string | null;
    book: Book | null;
    speaker: Speaker;
    links: SermonLink[];
};

export type SeriesListItem = {
    id: number;
    title: string;
    displayTitle: string | null;
    subtitle: string | null;
    description: string | null;
    latestSermonDate: string | null;
    sermonCount: number;
    book: Book | null;
};

export type SeriesDetail = SeriesListItem & {
    sermons: SermonListItem[];
};

export type Pagination = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

/**
 * Response shape for GET /api/sermons (after envelope unwrap).
 * Note: createApiClient automatically unwraps the { success, data } envelope,
 * so hooks receive this type directly — NOT the raw { success: true, data: { ... } } wrapper.
 */
export type PaginatedSermonsResponse = {
    sermons: SermonListItem[];
    pagination: Pagination;
};

/* ------------------------------------------------------------------ */
/*  Tab and View Types                                                 */
/* ------------------------------------------------------------------ */

export type TabId = 'sermons' | 'series' | 'compilations';
export type ScreenMode = 'browse' | 'detail';
export type ViewMode = 'grid' | 'list' | 'large';
export type SortField = 'date' | 'title';
export type SortOrder = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Campus ID Mapping (backwards compat)                               */
/* ------------------------------------------------------------------ */

const CAMPUS_SLUG_MAP: Record<string, number> = {
    buckhead: 1,
    brookhaven: 2,
    'peachtree-corners': 3,
};

/** Resolve campus config (string slug or number) to a congregation ID */
export function resolveCampusId(
    campus: string | number | undefined,
): number | undefined {
    if (campus === undefined || campus === '') return undefined;
    if (typeof campus === 'number') return campus;
    return CAMPUS_SLUG_MAP[campus] ?? undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/widget-sermons && pnpm vitest run src/__tests__/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Update the existing App.test.tsx to work with new config shape**

Update `packages/widget-sermons/src/__tests__/App.test.tsx` — change the `renderWithProviders` default config from `{ campus: 'buckhead', perPage: 12 }` to `{ perPage: 12, defaultTab: 'sermons', defaultView: 'grid' }`. Update the campus test to use `{ campus: 1 }` instead. The placeholder text assertions will be removed in a later task when App.tsx is rebuilt.

- [ ] **Step 6: Run all widget tests**

```bash
cd packages/widget-sermons && pnpm vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/widget-sermons/src/types.ts packages/widget-sermons/src/__tests__/
git commit -m "feat: replace placeholder types with real sermon API types"
```

---

### Task 3: Create Tabs shared component

**Files:**

- Create: `packages/shared/src/components/composite/Tabs.tsx`
- Create: `packages/shared/src/components/composite/Tabs.stories.tsx`
- Modify: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Create Tabs component**

Create `packages/shared/src/components/composite/Tabs.tsx`:

```typescript
import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface Tab {
    id: string;
    label: string;
    disabled?: boolean;
    badge?: ReactNode;
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div
            className={cn('flex border-b border-stone-200 dark:border-stone-700', className)}
            role="tablist"
        >
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-disabled={tab.disabled}
                        tabIndex={isActive ? 0 : -1}
                        disabled={tab.disabled}
                        onClick={() => {
                            if (!tab.disabled) onChange(tab.id);
                        }}
                        onKeyDown={(e) => {
                            const enabledTabs = tabs.filter((t) => !t.disabled);
                            const currentIndex = enabledTabs.findIndex((t) => t.id === tab.id);
                            let nextIndex = -1;

                            if (e.key === 'ArrowRight') {
                                nextIndex = (currentIndex + 1) % enabledTabs.length;
                            } else if (e.key === 'ArrowLeft') {
                                nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
                            }

                            if (nextIndex >= 0) {
                                e.preventDefault();
                                onChange(enabledTabs[nextIndex].id);
                                // Focus the new tab button
                                const tabList = e.currentTarget.parentElement;
                                const buttons = tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])');
                                buttons?.[nextIndex]?.focus();
                            }
                        }}
                        className={cn(
                            'relative px-4 py-2.5 text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
                            isActive
                                ? 'text-[var(--color-primary)]'
                                : 'text-stone-500 dark:text-stone-400',
                            !tab.disabled && !isActive && 'hover:text-stone-700 dark:hover:text-stone-300',
                            tab.disabled && 'opacity-50 cursor-not-allowed',
                        )}
                    >
                        <span className="flex items-center gap-2">
                            {tab.label}
                            {tab.badge}
                        </span>
                        {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Create Storybook story**

Create `packages/shared/src/components/composite/Tabs.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs } from './Tabs';
import { Badge } from '../primitives/Badge';

const meta = {
    title: 'Composite/Tabs',
    component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function TabsDemo() {
    const [active, setActive] = useState('sermons');
    return (
        <Tabs
            tabs={[
                { id: 'sermons', label: 'Sermons' },
                { id: 'series', label: 'Series' },
                {
                    id: 'compilations',
                    label: 'Compilations',
                    disabled: true,
                    badge: <Badge size="sm" variant="secondary">Soon</Badge>,
                },
            ]}
            activeTab={active}
            onChange={setActive}
        />
    );
}

export const Default: Story = {
    render: () => <TabsDemo />,
    args: { tabs: [], activeTab: '', onChange: () => {} },
};
```

- [ ] **Step 3: Export from shared components index**

Add to `packages/shared/src/components/composite/index.ts`:

```typescript
export { Tabs } from './Tabs';
export type { Tab, TabsProps } from './Tabs';
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck --filter=@perimeter-widgets/shared
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/composite/Tabs.tsx packages/shared/src/components/composite/Tabs.stories.tsx packages/shared/src/components/index.ts
git commit -m "feat: add Tabs shared component with keyboard navigation and Storybook story"
```

---

### Task 4: Create Pagination shared component

**Files:**

- Create: `packages/shared/src/components/composite/Pagination.tsx`
- Create: `packages/shared/src/components/composite/Pagination.stories.tsx`
- Modify: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Create Pagination component**

Create `packages/shared/src/components/composite/Pagination.tsx`:

```typescript
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
    /** Max page buttons to show (excluding prev/next). Default: 7 */
    maxButtons?: number;
    className?: string;
}

function getPageNumbers(current: number, total: number, max: number): (number | 'ellipsis')[] {
    if (total <= max) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const sideCount = Math.floor((max - 3) / 2); // pages on each side of current

    // Always include page 1
    pages.push(1);

    const leftBound = Math.max(2, current - sideCount);
    const rightBound = Math.min(total - 1, current + sideCount);

    if (leftBound > 2) pages.push('ellipsis');

    for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
    }

    if (rightBound < total - 1) pages.push('ellipsis');

    // Always include last page
    if (total > 1) pages.push(total);

    return pages;
}

const buttonBase = cn(
    'flex items-center justify-center rounded-md text-sm font-medium transition-colors',
    'h-8 min-w-8 px-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
);

export function Pagination({ page, totalPages, onChange, maxButtons = 7, className }: PaginationProps) {
    const pages = useMemo(() => getPageNumbers(page, totalPages, maxButtons), [page, totalPages, maxButtons]);

    if (totalPages <= 1) return null;

    return (
        <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
            <button
                type="button"
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className={cn(buttonBase, 'border border-stone-200 dark:border-stone-700', 'disabled:opacity-50 disabled:cursor-not-allowed', 'hover:bg-stone-100 dark:hover:bg-stone-800')}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {pages.map((p, i) =>
                p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-stone-400">...</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onChange(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                        className={cn(
                            buttonBase,
                            p === page
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800',
                        )}
                    >
                        {p}
                    </button>
                ),
            )}

            <button
                type="button"
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className={cn(buttonBase, 'border border-stone-200 dark:border-stone-700', 'disabled:opacity-50 disabled:cursor-not-allowed', 'hover:bg-stone-100 dark:hover:bg-stone-800')}
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </nav>
    );
}
```

- [ ] **Step 2: Create Storybook story**

Create `packages/shared/src/components/composite/Pagination.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination } from './Pagination';

const meta = {
    title: 'Composite/Pagination',
    component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

function PaginationDemo() {
    const [page, setPage] = useState(1);
    return (
        <div className="space-y-4">
            <p className="text-sm text-stone-500">Page {page} of 29</p>
            <Pagination page={page} totalPages={29} onChange={setPage} />
        </div>
    );
}

export const Default: Story = {
    render: () => <PaginationDemo />,
    args: { page: 1, totalPages: 29, onChange: () => {} },
};

export const FewPages: Story = {
    render: () => {
        const [page, setPage] = useState(1);
        return <Pagination page={page} totalPages={3} onChange={setPage} />;
    },
    args: { page: 1, totalPages: 3, onChange: () => {} },
};
```

- [ ] **Step 3: Export from shared components index**

Add to `packages/shared/src/components/composite/index.ts`:

```typescript
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck --filter=@perimeter-widgets/shared
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/composite/Pagination.tsx packages/shared/src/components/composite/Pagination.stories.tsx packages/shared/src/components/index.ts
git commit -m "feat: add Pagination shared component with ellipsis and Storybook story"
```

---

### Task 5: Create SearchInput shared component

**Files:**

- Create: `packages/shared/src/components/primitives/SearchInput.tsx`
- Create: `packages/shared/src/components/primitives/SearchInput.stories.tsx`
- Modify: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Create SearchInput component**

Create `packages/shared/src/components/primitives/SearchInput.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Debounce delay in ms. Default: 300 */
    debounce?: number;
    className?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    debounce = 300,
    className,
}: SearchInputProps) {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Sync external value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const debouncedOnChange = useCallback(
        (val: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => onChange(val), debounce);
        },
        [onChange, debounce],
    );

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleChange = (val: string) => {
        setLocalValue(val);
        debouncedOnChange(val);
    };

    const handleClear = () => {
        setLocalValue('');
        if (timerRef.current) clearTimeout(timerRef.current);
        onChange('');
    };

    return (
        <div className={cn('relative', className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        handleClear();
                        e.currentTarget.blur();
                    }
                }}
                placeholder={placeholder}
                className={cn(
                    'h-10 w-full rounded-lg border pl-9 pr-9 text-sm',
                    'bg-white dark:bg-stone-900',
                    'border-stone-300 dark:border-stone-600',
                    'text-stone-900 dark:text-stone-100',
                    'placeholder:text-stone-400 dark:placeholder:text-stone-500',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',
                    'focus-visible:border-[var(--color-primary)]',
                )}
                aria-label={placeholder}
            />
            {localValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Create Storybook story**

Create `packages/shared/src/components/primitives/SearchInput.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchInput } from './SearchInput';

const meta = {
    title: 'Primitives/SearchInput',
    component: SearchInput,
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function SearchInputDemo() {
    const [value, setValue] = useState('');
    return (
        <div className="space-y-2 max-w-sm">
            <SearchInput value={value} onChange={setValue} placeholder="Search sermons..." />
            <p className="text-xs text-stone-500">Debounced value: "{value}"</p>
        </div>
    );
}

export const Default: Story = {
    render: () => <SearchInputDemo />,
    args: { value: '', onChange: () => {} },
};
```

- [ ] **Step 3: Export from shared components index**

Add to `packages/shared/src/components/primitives/index.ts`:

```typescript
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck --filter=@perimeter-widgets/shared
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/primitives/SearchInput.tsx packages/shared/src/components/primitives/SearchInput.stories.tsx packages/shared/src/components/index.ts
git commit -m "feat: add SearchInput shared component with debounce and Storybook story"
```

---

### Task 6: Create DateRangePicker shared component

**Files:**

- Create: `packages/shared/src/components/composite/DateRangePicker.tsx`
- Create: `packages/shared/src/components/composite/DateRangePicker.stories.tsx`
- Modify: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Create DateRangePicker component**

Create `packages/shared/src/components/composite/DateRangePicker.tsx`:

```typescript
import { Calendar } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DateRangePickerProps {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    className?: string;
}

const inputClasses = cn(
    'h-9 rounded-lg border px-3 text-sm',
    'bg-white dark:bg-stone-900',
    'border-stone-300 dark:border-stone-600',
    'text-stone-900 dark:text-stone-100',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
    'focus-visible:border-[var(--color-primary)]',
);

export function DateRangePicker({
    from,
    to,
    onFromChange,
    onToChange,
    className,
}: DateRangePickerProps) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                    type="date"
                    value={from}
                    onChange={(e) => onFromChange(e.target.value)}
                    max={to || undefined}
                    className={cn(inputClasses, 'pl-8 w-[150px]')}
                    aria-label="From date"
                />
            </div>
            <span className="text-sm text-stone-400">to</span>
            <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                    type="date"
                    value={to}
                    onChange={(e) => onToChange(e.target.value)}
                    min={from || undefined}
                    className={cn(inputClasses, 'pl-8 w-[150px]')}
                    aria-label="To date"
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create Storybook story**

Create `packages/shared/src/components/composite/DateRangePicker.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DateRangePicker } from './DateRangePicker';

const meta = {
    title: 'Composite/DateRangePicker',
    component: DateRangePicker,
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function DateRangeDemo() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    return (
        <div className="space-y-2">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <p className="text-xs text-stone-500">
                Range: {from || '(none)'} — {to || '(none)'}
            </p>
        </div>
    );
}

export const Default: Story = {
    render: () => <DateRangeDemo />,
    args: { from: '', to: '', onFromChange: () => {}, onToChange: () => {} },
};
```

- [ ] **Step 3: Export from shared components index**

Add to `packages/shared/src/components/composite/index.ts`:

```typescript
export { DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps } from './DateRangePicker';
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck --filter=@perimeter-widgets/shared
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/composite/DateRangePicker.tsx packages/shared/src/components/composite/DateRangePicker.stories.tsx packages/shared/src/components/index.ts
git commit -m "feat: add DateRangePicker shared component with Storybook story"
```

---

## Chunk 2: Hooks — Query String State and API Data Fetching

### Task 7: Create use-sermon-filters hook (nuqs query string state)

**Files:**

- Create: `packages/widget-sermons/src/hooks/use-sermon-filters.ts`

- [ ] **Step 1: Create the hook**

Create `packages/widget-sermons/src/hooks/use-sermon-filters.ts`:

```typescript
import {
    parseAsInteger,
    parseAsString,
    parseAsStringLiteral,
    useQueryStates,
} from 'nuqs';
import type { SortField, SortOrder, TabId, ScreenMode } from '../types';

const sermonParams = {
    tab: parseAsStringLiteral(['sermons', 'series'] as const).withDefault(
        'sermons',
    ),
    screen: parseAsStringLiteral(['browse', 'detail'] as const).withDefault(
        'browse',
    ),
    id: parseAsInteger,
    search: parseAsString.withDefault(''),
    series: parseAsInteger,
    speaker: parseAsInteger,
    book: parseAsInteger,
    campus: parseAsInteger,
    from: parseAsString,
    to: parseAsString,
    sort: parseAsStringLiteral(['date', 'title'] as const).withDefault('date'),
    order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
    page: parseAsInteger.withDefault(1),
};

export function useSermonFilters() {
    const [params, setParams] = useQueryStates(sermonParams, {
        history: 'push',
    });

    const setTab = (tab: TabId) => {
        if (tab === 'compilations') return; // disabled
        setParams({
            tab: tab as 'sermons' | 'series',
            screen: 'browse',
            id: null,
            page: 1,
        });
    };

    const setScreen = (screen: ScreenMode, id?: number) => {
        setParams({ screen, id: id ?? null });
    };

    const setSearch = (search: string) => {
        setParams({ search: search || null, page: 1 });
    };

    const setSeries = (seriesId: number | null) => {
        setParams({ series: seriesId, page: 1 });
    };

    const setSpeaker = (speakerId: number | null) => {
        setParams({ speaker: speakerId, page: 1 });
    };

    const setBook = (bookId: number | null) => {
        setParams({ book: bookId, page: 1 });
    };

    const setCampus = (campusId: number | null) => {
        setParams({ campus: campusId, page: 1 });
    };

    const setDateRange = (from: string | null, to: string | null) => {
        setParams({ from: from || null, to: to || null, page: 1 });
    };

    const setSort = (sort: SortField, order: SortOrder) => {
        setParams({ sort, order, page: 1 });
    };

    const setPage = (page: number) => {
        setParams({ page });
    };

    const clearFilters = () => {
        setParams({
            search: null,
            series: null,
            speaker: null,
            book: null,
            campus: null,
            from: null,
            to: null,
            sort: 'date',
            order: 'desc',
            page: 1,
        });
    };

    const hasActiveFilters =
        !!params.search
        || params.series !== null
        || params.speaker !== null
        || params.book !== null
        || params.campus !== null
        || params.from !== null
        || params.to !== null;

    return {
        ...params,
        setTab,
        setScreen,
        setSearch,
        setSeries,
        setSpeaker,
        setBook,
        setCampus,
        setDateRange,
        setSort,
        setPage,
        clearFilters,
        hasActiveFilters,
    };
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-sermon-filters.ts
git commit -m "feat: add use-sermon-filters hook with nuqs query string state"
```

---

### Task 8: Create API data fetching hooks

**Files:**

- Create: `packages/widget-sermons/src/hooks/use-sermons.ts`
- Create: `packages/widget-sermons/src/hooks/use-sermon-detail.ts`
- Create: `packages/widget-sermons/src/hooks/use-series.ts`
- Create: `packages/widget-sermons/src/hooks/use-series-detail.ts`
- Create: `packages/widget-sermons/src/hooks/use-speakers.ts`
- Create: `packages/widget-sermons/src/hooks/use-books.ts`

- [ ] **Step 1: Create all data hooks**

Create `packages/widget-sermons/src/hooks/use-sermons.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { PaginatedSermonsResponse, SortField, SortOrder } from '../types';
import { resolveCampusId, type SermonsConfig } from '../types';

export interface UseSermonsParams {
    search?: string;
    series?: number | null;
    speaker?: number | null;
    book?: number | null;
    campus?: number | null;
    from?: string;
    to?: string;
    sort?: SortField;
    order?: SortOrder;
    page?: number;
    config: SermonsConfig;
}

export function useSermons(params: UseSermonsParams) {
    const {
        search,
        series,
        speaker,
        book,
        campus,
        from,
        to,
        sort = 'date',
        order = 'desc',
        page = 1,
        config,
    } = params;

    const client = createApiClient({ baseUrl: config.apiUrl });
    const campusId = campus ?? resolveCampusId(config.campus);

    return useQuery({
        queryKey: [
            'sermons',
            {
                search,
                series,
                speaker,
                book,
                campus: campusId,
                from,
                to,
                sort,
                order,
                page,
                perPage: config.perPage,
            },
        ],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (search) searchParams.set('search', search);
            if (series) searchParams.set('seriesId', String(series));
            if (speaker) searchParams.set('speakerId', String(speaker));
            if (book) searchParams.set('bookId', String(book));
            if (campusId) searchParams.set('congregationId', String(campusId));
            if (from) searchParams.set('from', from);
            if (to) searchParams.set('to', to);
            searchParams.set('sort', sort);
            searchParams.set('order', order);
            searchParams.set('page', String(page));
            searchParams.set('perPage', String(config.perPage));

            const qs = searchParams.toString();
            return client.get<PaginatedSermonsResponse>(`/api/sermons?${qs}`);
        },
    });
}
```

Create `packages/widget-sermons/src/hooks/use-sermon-detail.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SermonDetail, SermonsConfig } from '../types';

export function useSermonDetail(id: number | null, config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });

    return useQuery({
        queryKey: ['sermon-detail', id],
        queryFn: () => client.get<SermonDetail>(`/api/sermons/${id}`),
        enabled: id !== null && id > 0,
    });
}
```

Create `packages/widget-sermons/src/hooks/use-series.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SeriesListItem, SermonsConfig } from '../types';

export function useSeries(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });

    return useQuery({
        queryKey: ['series-list'],
        queryFn: () => client.get<SeriesListItem[]>('/api/sermons/series'),
    });
}
```

Create `packages/widget-sermons/src/hooks/use-series-detail.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { SeriesDetail, SermonsConfig } from '../types';

export function useSeriesDetail(id: number | null, config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });

    return useQuery({
        queryKey: ['series-detail', id],
        queryFn: () => client.get<SeriesDetail>(`/api/sermons/series/${id}`),
        enabled: id !== null && id > 0,
    });
}
```

Create `packages/widget-sermons/src/hooks/use-speakers.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Speaker, SermonsConfig } from '../types';

export function useSpeakers(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });

    return useQuery({
        queryKey: ['speakers'],
        queryFn: () => client.get<Speaker[]>('/api/sermons/speakers'),
        staleTime: 10 * 60 * 1000, // 10 minutes — speakers change rarely
    });
}
```

Create `packages/widget-sermons/src/hooks/use-books.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@perimeter-widgets/shared';
import type { Book, SermonsConfig } from '../types';

export function useBooks(config: SermonsConfig) {
    const client = createApiClient({ baseUrl: config.apiUrl });

    return useQuery({
        queryKey: ['books'],
        queryFn: () => client.get<Book[]>('/api/sermons/books'),
        staleTime: 30 * 60 * 1000, // 30 minutes — books are static
    });
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/hooks/
git commit -m "feat: add React Query hooks for all sermon API endpoints"
```

---

### Task 9: Port useMediaPlayer hook

**Files:**

- Create: `packages/widget-sermons/src/hooks/use-media-player.ts`

- [ ] **Step 1: Port the hook from helpdesk**

Create `packages/widget-sermons/src/hooks/use-media-player.ts`:

```typescript
import { useRef, useState, useCallback, useEffect } from 'react';

export function useMediaPlayer() {
    const mediaRef = useRef<HTMLMediaElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(1);
    const [playbackRate, setPlaybackRateState] = useState(1);

    const togglePlay = useCallback(() => {
        const el = mediaRef.current;
        if (!el) return;
        if (el.paused) {
            el.play();
            setIsPlaying(true);
        } else {
            el.pause();
            setIsPlaying(false);
        }
    }, []);

    const seek = useCallback((delta: number) => {
        const el = mediaRef.current;
        if (!el) return;
        el.currentTime = Math.max(
            0,
            Math.min(el.currentTime + delta, el.duration || 0),
        );
        setCurrentTime(el.currentTime);
    }, []);

    const seekTo = useCallback((time: number) => {
        const el = mediaRef.current;
        if (!el) return;
        el.currentTime = Math.max(0, Math.min(time, el.duration || 0));
        setCurrentTime(el.currentTime);
    }, []);

    const setVolume = useCallback((v: number) => {
        const clamped = Math.max(0, Math.min(1, v));
        setVolumeState(clamped);
        if (mediaRef.current) mediaRef.current.volume = clamped;
    }, []);

    const setPlaybackRate = useCallback((rate: number) => {
        setPlaybackRateState(rate);
        if (mediaRef.current) mediaRef.current.playbackRate = rate;
    }, []);

    useEffect(() => {
        const el = mediaRef.current;
        if (!el) return;

        const onTimeUpdate = () => setCurrentTime(el.currentTime);
        const onDurationChange = () => setDuration(el.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        el.addEventListener('timeupdate', onTimeUpdate);
        el.addEventListener('durationchange', onDurationChange);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        el.addEventListener('ended', onEnded);

        return () => {
            el.removeEventListener('timeupdate', onTimeUpdate);
            el.removeEventListener('durationchange', onDurationChange);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('ended', onEnded);
        };
    }, []);

    return {
        mediaRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        togglePlay,
        seek,
        seekTo,
        setVolume,
        setPlaybackRate,
    };
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/hooks/use-media-player.ts
git commit -m "feat: port useMediaPlayer hook from helpdesk domain"
```

---

## Chunk 3: Media Players — Ported from Helpdesk

### Task 10: Port VideoPlayer component

**Files:**

- Create: `packages/widget-sermons/src/components/players/VideoPlayer.tsx`

- [ ] **Step 1: Create VideoPlayer adapted for shadow DOM**

Create `packages/widget-sermons/src/components/players/VideoPlayer.tsx` — port from helpdesk with these changes:

- Remove `'use client'` directive (not Next.js)
- Change import path: `useMediaPlayer` from `../../hooks/use-media-player`
- Replace `@hooks/helpdesk/use-media-player` import
- Keep all Tailwind classes and lucide-react icons as-is (they work in shadow DOM via the shared token system)

```typescript
import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { useMediaPlayer } from '../../hooks/use-media-player';

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function VideoPlayer({ url }: { url: string }) {
    const {
        mediaRef, isPlaying, currentTime, duration, volume, playbackRate,
        togglePlay, seekTo, setVolume, setPlaybackRate,
    } = useMediaPlayer();

    const containerRef = useRef<HTMLDivElement>(null);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            el.requestFullscreen();
            setIsFullscreen(true);
        }
    }, []);

    const cycleSpeed = useCallback(() => {
        const currentIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
        const nextIndex = (currentIndex + 1) % SPEEDS.length;
        setPlaybackRate(SPEEDS[nextIndex]);
    }, [playbackRate, setPlaybackRate]);

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full items-center justify-center bg-black"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={url}
                className="h-full w-full object-contain"
                preload="metadata"
                onClick={togglePlay}
            />
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                <div className="flex w-max max-w-[90vw] items-center gap-3 rounded-xl bg-stone-900/60 px-4 py-2.5 backdrop-blur-md">
                    <button type="button" onClick={togglePlay} className="text-white hover:text-white/80" aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <span className="whitespace-nowrap text-xs text-white/80">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={(e) => seekTo(parseFloat(e.target.value))} className="h-1.5 w-40 min-w-24 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary" aria-label="Seek" />
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white hover:text-white/80" aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
                            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary" aria-label="Volume" />
                    </div>
                    <button type="button" onClick={cycleSpeed} className="rounded px-1.5 py-0.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label={`Playback speed ${playbackRate}x`}>{playbackRate}x</button>
                    <button type="button" onClick={toggleFullscreen} className="text-white hover:text-white/80" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/components/players/VideoPlayer.tsx
git commit -m "feat: port VideoPlayer from helpdesk domain"
```

---

### Task 11: Port AudioPlayer component

**Files:**

- Create: `packages/widget-sermons/src/components/players/AudioPlayer.tsx`

- [ ] **Step 1: Create AudioPlayer**

Create `packages/widget-sermons/src/components/players/AudioPlayer.tsx` — same pattern as VideoPlayer port: remove `'use client'`, update import path.

```typescript
import { useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useMediaPlayer } from '../../hooks/use-media-player';

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function AudioPlayer({ url }: { url: string }) {
    const {
        mediaRef, isPlaying, currentTime, duration, volume, playbackRate,
        togglePlay, seekTo, setVolume, setPlaybackRate,
    } = useMediaPlayer();

    const cycleSpeed = useCallback(() => {
        const currentIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
        const nextIndex = (currentIndex + 1) % SPEEDS.length;
        setPlaybackRate(SPEEDS[nextIndex]);
    }, [playbackRate, setPlaybackRate]);

    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex w-full max-w-[500px] items-center gap-3 rounded-xl bg-stone-100 px-5 py-3 shadow-lg dark:bg-stone-800">
                <button type="button" onClick={togglePlay} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={(e) => seekTo(parseFloat(e.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-stone-300 accent-primary dark:bg-stone-600" aria-label="Seek" />
                <span className="whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200" aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
                        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-stone-300 accent-primary dark:bg-stone-600" aria-label="Volume" />
                </div>
                <button type="button" onClick={cycleSpeed} className="rounded px-1.5 py-0.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200" aria-label={`Playback speed ${playbackRate}x`}>{playbackRate}x</button>
            </div>
            <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={url} preload="metadata" />
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget-sermons/src/components/players/AudioPlayer.tsx
git commit -m "feat: port AudioPlayer from helpdesk domain"
```

---

### Task 12: Port PdfViewer and create MediaTabs

**Files:**

- Create: `packages/widget-sermons/src/components/players/PdfViewer.tsx`
- Create: `packages/widget-sermons/src/components/players/MediaTabs.tsx`

- [ ] **Step 1: Create PdfViewer**

Create `packages/widget-sermons/src/components/players/PdfViewer.tsx` — port from `perimeter-api/src/components/helpdesk/viewers/PdfViewer.tsx` with these import changes:

| Original import                                              | Replacement                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `'use client'`                                               | Remove entirely (not Next.js)                                |
| `import { Button } from '@components/ui/primitives'`         | `import { Button } from '@perimeter-widgets/shared'`         |
| `import { LoadingSpinner } from '@components/ui/primitives'` | `import { LoadingSpinner } from '@perimeter-widgets/shared'` |

Keep all other imports (react-pdf, lucide-react icons) and the CDN worker config unchanged:

```typescript
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

The rest of the component (~250 lines) is ported verbatim — page navigation, zoom controls, thumbnail sidebar, all Tailwind classes.

- [ ] **Step 2: Create MediaTabs component**

Create `packages/widget-sermons/src/components/players/MediaTabs.tsx`:

```typescript
import { useState, lazy, Suspense } from 'react';
import { Tabs } from '@perimeter-widgets/shared';
import { LoadingSpinner } from '@perimeter-widgets/shared';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import type { SermonLink } from '../../types';

const PdfViewer = lazy(() =>
    import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
);

export interface MediaTabsProps {
    links: SermonLink[];
}

type MediaTab = 'video' | 'audio' | 'document';

export function MediaTabs({ links }: MediaTabsProps) {
    const videoLink = links.find((l) => l.mediaType === 'video');
    const audioLink = links.find((l) => l.mediaType === 'audio');
    const docLink = links.find((l) => l.mediaType === 'document');

    const availableTabs: { id: MediaTab; label: string }[] = [];
    if (videoLink) availableTabs.push({ id: 'video', label: 'Watch' });
    if (audioLink) availableTabs.push({ id: 'audio', label: 'Listen' });
    if (docLink) availableTabs.push({ id: 'document', label: 'PDF' });

    const [activeTab, setActiveTab] = useState<string>(
        availableTabs[0]?.id ?? 'video',
    );

    if (availableTabs.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
            <Tabs
                tabs={availableTabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />
            <div className="min-h-[300px]">
                {activeTab === 'video' && videoLink && (
                    <div className="aspect-video">
                        <VideoPlayer url={videoLink.url} />
                    </div>
                )}
                {activeTab === 'audio' && audioLink && (
                    <AudioPlayer url={audioLink.url} />
                )}
                {activeTab === 'document' && docLink && (
                    <Suspense
                        fallback={
                            <div className="flex h-[400px] items-center justify-center">
                                <LoadingSpinner size="lg" label="Loading PDF viewer" />
                            </div>
                        }
                    >
                        <div className="h-[600px]">
                            <PdfViewer url={docLink.url} />
                        </div>
                    </Suspense>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/widget-sermons/src/components/players/
git commit -m "feat: port PdfViewer and create MediaTabs with lazy loading"
```

---

## Chunk 4: Widget UI Components — Views and Filters

### Task 13: Create SermonTabs (top-level tab bar)

**Files:**

- Create: `packages/widget-sermons/src/components/SermonTabs.tsx`

- [ ] **Step 1: Create SermonTabs**

```typescript
import { Badge, Tabs } from '@perimeter-widgets/shared';
import type { TabId } from '../types';

const TABS = [
    { id: 'sermons' as const, label: 'Sermons' },
    { id: 'series' as const, label: 'Series' },
    {
        id: 'compilations' as const,
        label: 'Compilations',
        disabled: true,
        badge: <Badge size="sm" variant="secondary">Soon</Badge>,
    },
];

export interface SermonTabsProps {
    activeTab: string;
    onTabChange: (tab: TabId) => void;
}

export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
    return (
        <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={(id) => onTabChange(id as TabId)}
        />
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget-sermons/src/components/SermonTabs.tsx
git commit -m "feat: add SermonTabs top-level tab bar component"
```

---

### Task 14: Create SermonFilters component

**Files:**

- Create: `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`

- [ ] **Step 1: Create the filter bar**

Create `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`:

```typescript
import { useState } from 'react';
import {
    SearchInput,
    ComboSelect,
    Select,
    DateRangePicker,
    Badge,
    Button,
} from '@perimeter-widgets/shared';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Speaker, Book, SeriesListItem, SortField, SortOrder } from '../../types';

export interface SermonFiltersProps {
    search: string;
    series: number | null;
    speaker: number | null;
    book: number | null;
    campus: number | null;
    from: string;
    to: string;
    sort: SortField;
    order: SortOrder;
    hasActiveFilters: boolean;
    // Data for dropdowns
    seriesList: SeriesListItem[];
    speakers: Speaker[];
    books: Book[];
    seriesLoading?: boolean;
    speakersLoading?: boolean;
    booksLoading?: boolean;
    // Callbacks
    onSearchChange: (value: string) => void;
    onSeriesChange: (value: number | null) => void;
    onSpeakerChange: (value: number | null) => void;
    onBookChange: (value: number | null) => void;
    onCampusChange: (value: number | null) => void;
    onDateRangeChange: (from: string, to: string) => void;
    onSortChange: (sort: SortField, order: SortOrder) => void;
    onClearFilters: () => void;
}

const SORT_OPTIONS = [
    { value: 'date-desc', label: 'Date: Newest' },
    { value: 'date-asc', label: 'Date: Oldest' },
    { value: 'title-asc', label: 'Title: A-Z' },
    { value: 'title-desc', label: 'Title: Z-A' },
];

const CAMPUS_OPTIONS = [
    { value: 1, label: 'Buckhead' },
    { value: 2, label: 'Brookhaven' },
    { value: 3, label: 'Peachtree Corners' },
];

export function SermonFilters(props: SermonFiltersProps) {
    const [showMore, setShowMore] = useState(false);

    const sortValue = `${props.sort}-${props.order}`;
    const handleSortChange = (value: string) => {
        const [sort, order] = value.split('-') as [SortField, SortOrder];
        props.onSortChange(sort, order);
    };

    const seriesOptions = props.seriesList.map((s) => ({
        value: s.id,
        label: s.displayTitle ?? s.title,
    }));

    const speakerOptions = props.speakers.map((s) => ({
        value: s.id,
        label: s.name,
    }));

    const bookOptions = props.books.map((b) => ({
        value: b.id,
        label: b.name,
    }));

    return (
        <div className="space-y-3">
            {/* Inline filters */}
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput
                    value={props.search}
                    onChange={props.onSearchChange}
                    placeholder="Search sermons..."
                    className="min-w-[200px] flex-1"
                />
                <ComboSelect
                    value={props.series ?? ''}
                    onChange={(v) => props.onSeriesChange(v === '' ? null : v)}
                    options={seriesOptions}
                    placeholder="All Series"
                    showAllOption
                    allOptionLabel="All Series"
                    loading={props.seriesLoading}
                />
                <ComboSelect
                    value={props.speaker ?? ''}
                    onChange={(v) => props.onSpeakerChange(v === '' ? null : v)}
                    options={speakerOptions}
                    placeholder="All Speakers"
                    showAllOption
                    allOptionLabel="All Speakers"
                    loading={props.speakersLoading}
                />
                <Select
                    value={sortValue}
                    onChange={(e) => handleSortChange(e.target.value)}
                    options={SORT_OPTIONS}
                    size="md"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMore(!showMore)}
                >
                    <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                    More Filters
                </Button>
            </div>

            {/* Expandable filters */}
            {showMore && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-3 dark:bg-stone-900">
                    <ComboSelect
                        value={props.book ?? ''}
                        onChange={(v) => props.onBookChange(v === '' ? null : v)}
                        options={bookOptions}
                        placeholder="All Books"
                        showAllOption
                        allOptionLabel="All Books"
                        loading={props.booksLoading}
                    />
                    <ComboSelect<number>
                        value={props.campus ?? ''}
                        onChange={(v) => props.onCampusChange(v === '' ? null : v)}
                        options={CAMPUS_OPTIONS}
                        placeholder="All Campuses"
                        showAllOption
                        allOptionLabel="All Campuses"
                    />
                    <DateRangePicker
                        from={props.from}
                        to={props.to}
                        onFromChange={(from) => props.onDateRangeChange(from, props.to)}
                        onToChange={(to) => props.onDateRangeChange(props.from, to)}
                    />
                    {props.hasActiveFilters && (
                        <button
                            type="button"
                            onClick={props.onClearFilters}
                            className="text-sm text-red-500 underline hover:text-red-700"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            )}

            {/* Active filter chips */}
            {props.hasActiveFilters && (
                <div className="flex flex-wrap gap-1.5">
                    {props.series && (
                        <button type="button" onClick={() => props.onSeriesChange(null)} className="inline-flex">
                            <Badge variant="primary" size="sm">
                                {seriesOptions.find((o) => o.value === props.series)?.label ?? 'Series'} <X className="ml-1 h-3 w-3" />
                            </Badge>
                        </button>
                    )}
                    {props.speaker && (
                        <button type="button" onClick={() => props.onSpeakerChange(null)} className="inline-flex">
                            <Badge variant="primary" size="sm">
                                {speakerOptions.find((o) => o.value === props.speaker)?.label ?? 'Speaker'} <X className="ml-1 h-3 w-3" />
                            </Badge>
                        </button>
                    )}
                    {props.book && (
                        <button type="button" onClick={() => props.onBookChange(null)} className="inline-flex">
                            <Badge variant="primary" size="sm">
                                {bookOptions.find((o) => o.value === props.book)?.label ?? 'Book'} <X className="ml-1 h-3 w-3" />
                            </Badge>
                        </button>
                    )}
                    {props.search && (
                        <button type="button" onClick={() => props.onSearchChange('')} className="inline-flex">
                            <Badge variant="secondary" size="sm">
                                "{props.search}" <X className="ml-1 h-3 w-3" />
                            </Badge>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonFilters.tsx
git commit -m "feat: add SermonFilters with inline and expandable filter bar"
```

---

### Task 15: Create sermon list view components (card grid, small list, large cards)

**Files:**

- Create: `packages/widget-sermons/src/components/sermons/SermonCardGrid.tsx`
- Create: `packages/widget-sermons/src/components/sermons/SermonSmallList.tsx`
- Create: `packages/widget-sermons/src/components/sermons/SermonLargeCards.tsx`

- [ ] **Step 1: Create all three view components**

All three share the same props interface and date formatting:

```typescript
import { DateTime } from 'luxon';
import { Badge } from '@perimeter-widgets/shared';
import type { SermonListItem } from '../../types';

export interface SermonListViewProps {
    sermons: SermonListItem[];
    onSermonClick: (id: number) => void;
}

function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}
```

**SermonCardGrid.tsx** — responsive 3/2/1 column grid:

```tsx
export function SermonCardGrid({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    return (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='overflow-hidden rounded-lg border border-stone-200 text-left transition-shadow hover:shadow-md dark:border-stone-700'
                >
                    {sermon.bannerUrl ?
                        <img
                            src={sermon.bannerUrl}
                            alt=''
                            className='aspect-video w-full object-cover'
                        />
                    :   <div className='aspect-video w-full bg-gradient-to-br from-primary/80 to-primary' />
                    }
                    <div className='p-3'>
                        <h3 className='font-semibold text-sm text-stone-900 dark:text-stone-100 line-clamp-1'>
                            {sermon.title}
                        </h3>
                        <p className='text-xs text-stone-500 dark:text-stone-400 mt-1'>
                            {sermon.speaker.name}
                        </p>
                        <div className='flex items-center justify-between mt-2'>
                            <span className='text-xs text-stone-400'>
                                {formatDate(sermon.date)}
                            </span>
                            <Badge size='sm' variant='secondary'>
                                {sermon.series.title}
                            </Badge>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
```

**SermonSmallList.tsx** — compact horizontal rows:

```tsx
export function SermonSmallList({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    return (
        <div className='flex flex-col gap-1'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800'
                >
                    {sermon.bannerUrl ?
                        <img
                            src={sermon.bannerUrl}
                            alt=''
                            className='h-12 w-12 rounded-md object-cover shrink-0'
                        />
                    :   <div className='h-12 w-12 rounded-md bg-gradient-to-br from-primary/80 to-primary shrink-0' />
                    }
                    <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-sm text-stone-900 dark:text-stone-100 truncate'>
                            {sermon.title}
                        </h3>
                        <p className='text-xs text-stone-500 dark:text-stone-400'>
                            {sermon.speaker.name} · {formatDate(sermon.date)}
                        </p>
                    </div>
                    <Badge size='sm' variant='secondary' className='shrink-0'>
                        {sermon.series.title}
                    </Badge>
                </button>
            ))}
        </div>
    );
}
```

**SermonLargeCards.tsx** — single-column horizontal cards with description:

```tsx
export function SermonLargeCards({
    sermons,
    onSermonClick,
}: SermonListViewProps) {
    return (
        <div className='flex flex-col gap-3'>
            {sermons.map((sermon) => (
                <button
                    key={sermon.id}
                    type='button'
                    onClick={() => onSermonClick(sermon.id)}
                    className='flex overflow-hidden rounded-lg border border-stone-200 text-left transition-shadow hover:shadow-md dark:border-stone-700'
                >
                    {sermon.bannerUrl ?
                        <img
                            src={sermon.bannerUrl}
                            alt=''
                            className='w-44 shrink-0 object-cover'
                        />
                    :   <div className='w-44 shrink-0 bg-gradient-to-br from-primary/80 to-primary' />
                    }
                    <div className='flex-1 p-3'>
                        <h3 className='font-semibold text-stone-900 dark:text-stone-100'>
                            {sermon.title}
                        </h3>
                        <p className='text-xs text-stone-500 dark:text-stone-400 mt-1'>
                            {sermon.speaker.name} · {sermon.series.title}
                        </p>
                        {sermon.shortDescription && (
                            <p className='text-xs text-stone-600 dark:text-stone-300 mt-2 line-clamp-2'>
                                {sermon.shortDescription}
                            </p>
                        )}
                        <span className='text-xs text-stone-400 mt-2 block'>
                            {formatDate(sermon.date)}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonCardGrid.tsx packages/widget-sermons/src/components/sermons/SermonSmallList.tsx packages/widget-sermons/src/components/sermons/SermonLargeCards.tsx
git commit -m "feat: add sermon list view components (card grid, small list, large cards)"
```

---

### Task 16: Create SermonsView container

**Files:**

- Create: `packages/widget-sermons/src/components/sermons/SermonsView.tsx`

- [ ] **Step 1: Create container that wires up filters, list views, and pagination**

```typescript
import { useState } from 'react';
import { useConfig, Pagination, Select, SkeletonTransition, Skeleton } from '@perimeter-widgets/shared';
import type { SermonsConfig, ViewMode } from '../../types';
import { useSermons } from '../../hooks/use-sermons';
import { useSeries } from '../../hooks/use-series';
import { useSpeakers } from '../../hooks/use-speakers';
import { useBooks } from '../../hooks/use-books';
import { SermonFilters } from './SermonFilters';
import { SermonCardGrid } from './SermonCardGrid';
import { SermonSmallList } from './SermonSmallList';
import { SermonLargeCards } from './SermonLargeCards';

// Props are passed from App.tsx which has the filters hook
interface SermonsViewProps {
    config: SermonsConfig;
    filters: ReturnType<typeof import('../../hooks/use-sermon-filters').useSermonFilters>;
}

const VIEW_OPTIONS = [
    { value: 'grid', label: 'Card Grid' },
    { value: 'list', label: 'Small List' },
    { value: 'large', label: 'Large Cards' },
];

export function SermonsView({ config, filters }: SermonsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(config.defaultView ?? 'grid');

    const { data, isLoading } = useSermons({ ...filters, config });
    const { data: seriesList = [], isLoading: seriesLoading } = useSeries(config);
    const { data: speakers = [], isLoading: speakersLoading } = useSpeakers(config);
    const { data: books = [], isLoading: booksLoading } = useBooks(config);

    const sermons = data?.sermons ?? [];
    const pagination = data?.pagination;

    const ViewComponent =
        viewMode === 'list' ? SermonSmallList
        : viewMode === 'large' ? SermonLargeCards
        : SermonCardGrid;

    return (
        <div className="space-y-4">
            <SermonFilters
                search={filters.search}
                series={filters.series}
                speaker={filters.speaker}
                book={filters.book}
                campus={filters.campus}
                from={filters.from ?? ''}
                to={filters.to ?? ''}
                sort={filters.sort}
                order={filters.order}
                hasActiveFilters={filters.hasActiveFilters}
                seriesList={seriesList}
                speakers={speakers}
                books={books}
                seriesLoading={seriesLoading}
                speakersLoading={speakersLoading}
                booksLoading={booksLoading}
                onSearchChange={filters.setSearch}
                onSeriesChange={filters.setSeries}
                onSpeakerChange={filters.setSpeaker}
                onBookChange={filters.setBook}
                onCampusChange={filters.setCampus}
                onDateRangeChange={filters.setDateRange}
                onSortChange={filters.setSort}
                onClearFilters={filters.clearFilters}
            />

            <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">
                    {pagination ? `${pagination.total} sermons` : ''}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">View:</span>
                    <Select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                        options={VIEW_OPTIONS}
                        size="sm"
                    />
                </div>
            </div>

            <SkeletonTransition
                isLoading={isLoading}
                skeleton={<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: config.perPage }, (_, i) => <Skeleton key={i} variant="card" className="h-48 w-full" />)}</div>}
            >
                <ViewComponent
                    sermons={sermons}
                    onSermonClick={(id) => filters.setScreen('detail', id)}
                />
            </SkeletonTransition>

            {pagination && pagination.totalPages > 1 && (
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={filters.setPage}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonsView.tsx
git commit -m "feat: add SermonsView container with filters, view toggle, and pagination"
```

---

### Task 17: Create SermonDetail component

**Files:**

- Create: `packages/widget-sermons/src/components/sermons/SermonDetail.tsx`

- [ ] **Step 1: Create the detail view**

```typescript
import { DateTime } from 'luxon';
import { ArrowLeft } from 'lucide-react';
import { EmptyState, Skeleton, SkeletonTransition } from '@perimeter-widgets/shared';
import type { SermonsConfig } from '../../types';
import { useSermonDetail } from '../../hooks/use-sermon-detail';
import { MediaTabs } from '../players/MediaTabs';

interface SermonDetailProps {
    id: number;
    config: SermonsConfig;
    onBack: () => void;
}

function getInitials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function SermonDetail({ id, config, onBack }: SermonDetailProps) {
    const { data: sermon, isLoading, error } = useSermonDetail(id, config);

    if (error) {
        return (
            <div>
                <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-primary mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <EmptyState title="Sermon not found" description="This sermon may have been removed or is unavailable." />
            </div>
        );
    }

    return (
        <div>
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-primary mb-4">
                <ArrowLeft className="h-4 w-4" /> Back to sermons
            </button>

            <SkeletonTransition
                isLoading={isLoading}
                skeleton={<div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton variant="card" className="h-64 w-full" /><Skeleton className="h-24 w-full" /></div>}
            >
                {sermon && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{sermon.title}</h2>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                                {sermon.speaker.name} · {DateTime.fromISO(sermon.date).toLocaleString(DateTime.DATE_MED)} · {sermon.series.title}
                            </p>
                            {sermon.scriptureLinks && (
                                <p className="text-xs text-stone-400 mt-1">Scripture: {sermon.scriptureLinks}</p>
                            )}
                        </div>

                        {sermon.links.length > 0 && <MediaTabs links={sermon.links} />}

                        {sermon.description && (
                            <div className="rounded-lg bg-stone-50 p-4 dark:bg-stone-900">
                                <h3 className="font-semibold text-sm mb-2">About this sermon</h3>
                                <div className="text-sm text-stone-600 dark:text-stone-300 prose prose-sm" dangerouslySetInnerHTML={{ __html: sermon.description }} />
                            </div>
                        )}

                        <div className="flex items-center gap-3 rounded-lg bg-stone-50 p-4 dark:bg-stone-900">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                {getInitials(sermon.speaker.name)}
                            </div>
                            <div>
                                <p className="font-semibold text-sm">{sermon.speaker.name}</p>
                                {sermon.speaker.bio && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{sermon.speaker.bio}</p>}
                            </div>
                        </div>
                    </div>
                )}
            </SkeletonTransition>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/widget-sermons/src/components/sermons/SermonDetail.tsx
git commit -m "feat: add SermonDetail with tabbed media player"
```

---

### Task 18: Create Series view components

**Files:**

- Create: `packages/widget-sermons/src/components/series/SeriesView.tsx`
- Create: `packages/widget-sermons/src/components/series/SeriesGrid.tsx`
- Create: `packages/widget-sermons/src/components/series/SeriesDetail.tsx`

- [ ] **Step 1: Create SeriesGrid**

Text-only card grid for series (title, subtitle, sermon count, latest date, book badge). Client-side search filter.

- [ ] **Step 2: Create SeriesDetail**

Back button, series header, numbered sermon list. Each sermon row navigates to sermon detail.

- [ ] **Step 3: Create SeriesView container**

Wires up search, grid, and detail routing based on `screen` query param.

- [ ] **Step 4: Commit**

```bash
git add packages/widget-sermons/src/components/series/
git commit -m "feat: add Series tab components (grid, detail, container)"
```

---

### Task 19: Create ComingSoon placeholder and wire up App.tsx

**Files:**

- Create: `packages/widget-sermons/src/components/compilations/ComingSoon.tsx`
- Modify: `packages/widget-sermons/src/App.tsx`

- [ ] **Step 1: Create ComingSoon**

```typescript
import { EmptyState } from '@perimeter-widgets/shared';
import { Clock } from 'lucide-react';

export function ComingSoon() {
    return (
        <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="Compilations coming soon"
            description="We're working on bringing curated sermon compilations to this page."
        />
    );
}
```

- [ ] **Step 2: Rewrite App.tsx**

Replace `packages/widget-sermons/src/App.tsx`:

```typescript
import { useConfig } from '@perimeter-widgets/shared';
import { NuqsAdapter } from 'nuqs/adapters/react';
import type { SermonsConfig } from './types';
import { useSermonFilters } from './hooks/use-sermon-filters';
import { SermonTabs } from './components/SermonTabs';
import { SermonsView } from './components/sermons/SermonsView';
import { SermonDetail } from './components/sermons/SermonDetail';
import { SeriesView } from './components/series/SeriesView';
import { ComingSoon } from './components/compilations/ComingSoon';

function SermonsWidget() {
    const config = useConfig<SermonsConfig>();
    const filters = useSermonFilters();

    // Detail view takes over the full widget
    if (filters.screen === 'detail' && filters.id) {
        return (
            <div className="p-4">
                <SermonDetail
                    id={filters.id}
                    config={config}
                    onBack={() => filters.setScreen('browse')}
                />
            </div>
        );
    }

    return (
        <div className="p-4">
            <SermonTabs
                activeTab={filters.tab}
                onTabChange={filters.setTab}
            />
            <div className="mt-4">
                {filters.tab === 'sermons' && (
                    <SermonsView config={config} filters={filters} />
                )}
                {filters.tab === 'series' && (
                    <SeriesView config={config} filters={filters} />
                )}
                {filters.tab === 'compilations' && <ComingSoon />}
            </div>
        </div>
    );
}

export function SermonsApp() {
    return (
        <NuqsAdapter>
            <SermonsWidget />
        </NuqsAdapter>
    );
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck --filter=widget-sermons
```

- [ ] **Step 4: Commit**

```bash
git add packages/widget-sermons/src/components/compilations/ComingSoon.tsx packages/widget-sermons/src/App.tsx
git commit -m "feat: wire up App.tsx with tab routing, detail views, and nuqs adapter"
```

---

## Chunk 5: Storyboard, Mocks, Docs, and Final Integration

### Task 20: Update storyboard registry and MSW handlers

**Files:**

- Modify: `packages/storyboard/src/registry.ts`
- Modify: `packages/storyboard/src/mocks/handlers.ts`
- Modify: `packages/storyboard/src/mocks/data/sermons.ts`

- [ ] **Step 1: Update registry** — change status from `skeleton` to `ready`, update campus options to integer values with migration comment, add `defaultTab` and `defaultView` config fields.

- [ ] **Step 2: Update mock data** — replace placeholder types with real API response shapes matching the spec types (`SermonListItem`, `SermonDetail`, `SeriesListItem`, etc.).

- [ ] **Step 3: Update MSW handlers** — add missing handlers for `GET /api/sermons/series/:id`, `GET /api/sermons/speakers`, `GET /api/sermons/books`. Update existing handlers to use paginated response format for `GET /api/sermons`.

- [ ] **Step 4: Commit**

```bash
git add packages/storyboard/src/
git commit -m "feat: update storyboard registry, MSW handlers, and mock data for sermons widget"
```

---

### Task 21: Update tests

**Files:**

- Modify: `packages/widget-sermons/src/__tests__/App.test.tsx`
- Create: `packages/widget-sermons/src/__tests__/sermon-filters.test.ts`

- [ ] **Step 1: Update App.test.tsx** — update to work with the new App component. Test that it renders the tab bar, shows the sermons tab by default.

- [ ] **Step 2: Create sermon-filters.test.ts** — test the `resolveCampusId` function from types.ts, and verify filter state shape.

- [ ] **Step 3: Run all tests**

```bash
pnpm test --filter=widget-sermons
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/widget-sermons/src/__tests__/
git commit -m "test: update widget tests for new sermon finder architecture"
```

---

### Task 22: Update docs and run quality checks

**Files:**

- Modify: `docs/widgets/sermons.md`

- [ ] **Step 1: Update sermons widget doc** — replace placeholder content with real architecture, component list, API types, config attributes, and embed code.

- [ ] **Step 2: Run full quality checks**

```bash
pnpm quality
```

Expected: All checks pass (typecheck + lint + format + test).

- [ ] **Step 3: Fix any issues** — address lint warnings, type errors, format issues.

- [ ] **Step 4: Commit**

```bash
git add docs/widgets/sermons.md
git commit -m "docs: update sermons widget documentation to reflect final architecture"
```

---

### Task 23: Final integration test in storyboard

- [ ] **Step 1: Start storyboard in local mode**

```bash
VITE_API_MODE=local pnpm dev
```

- [ ] **Step 2: Verify in browser** — test tab switching, search, filter, pagination, view toggle, sermon detail with media player, series browse, series detail, back navigation, query string persistence.

- [ ] **Step 3: Test with MSW mocks**

```bash
pnpm dev
```

Verify all views render with mock data.

- [ ] **Step 4: Run final quality check and commit**

```bash
pnpm quality && git add -A && git commit -m "feat: complete sermon finder widget implementation"
```

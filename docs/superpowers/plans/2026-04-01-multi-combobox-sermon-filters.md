# MultiCombobox Sermon Filters Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all four filter dropdowns in the sermons widget with the new `MultiCombobox` component from the style registry.

**Architecture:** Port `MultiCombobox` (downshift-based, single+multi select with type-ahead search) from the style registry into `@perimeter-widgets/shared`, then swap the three `Select` dropdowns and the hand-rolled `ServiceTypeMultiSelect` in `SermonFilters` for `MultiCombobox` instances.

**Tech Stack:** React 19, downshift, TypeScript, Vite, nuqs

**Spec:** `docs/superpowers/specs/2026-04-01-multi-combobox-sermon-filters-design.md`

---

## File Map

| Action | File                                                               | Responsibility                                           |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Create | `packages/shared/src/components/ui/perimeter/multi-combobox.tsx`   | MultiCombobox component (ported from style registry)     |
| Modify | `packages/shared/package.json`                                     | Add `downshift` dependency                               |
| Modify | `packages/shared/src/components/index.ts`                          | Export MultiCombobox                                     |
| Modify | `packages/widget-sermons/src/hooks/use-sermon-filters.ts`          | Add `setServiceTypes` function                           |
| Modify | `packages/widget-sermons/src/components/sermons/SermonFilters.tsx` | Replace Select/ServiceTypeMultiSelect with MultiCombobox |
| Modify | `packages/widget-sermons/src/components/sermons/SermonsView.tsx`   | Update props passed to SermonFilters                     |

---

## Chunk 1: Port MultiCombobox to shared package

### Task 1: Add downshift dependency

**Files:**

- Modify: `packages/shared/package.json`

- [ ] **Step 1: Add downshift to shared package dependencies**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm add downshift@^9.3.2 --filter=@perimeter-widgets/shared
```

- [ ] **Step 2: Verify installation**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm ls downshift --filter=@perimeter-widgets/shared`
Expected: `downshift 9.x.x` listed

---

### Task 2: Port MultiCombobox component

**Files:**

- Create: `packages/shared/src/components/ui/perimeter/multi-combobox.tsx`
- Reference: `../../style/registry/ui/perimeter/multi-combobox.tsx` (source)

- [ ] **Step 1: Create the component file**

Copy from `style/registry/ui/perimeter/multi-combobox.tsx` with these adaptations:

- Remove `"use client"` directive (line 1)
- Change `import { cn } from "@/lib/utils"` to `import { cn } from '../../../lib/utils'`

The full file content:

```tsx
import * as React from 'react';
import { useCombobox, useMultipleSelection } from 'downshift';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';

import { cn } from '../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MultiComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface MultiComboboxBaseProps {
    /** Available options */
    options: MultiComboboxOption[];
    /** Placeholder text when nothing is selected */
    placeholder?: string;
    /** Short label shown when items are selected (e.g., "Fruits"). Falls back to placeholder. */
    selectedLabel?: string;
    /** Disable the entire combobox */
    disabled?: boolean;
    /** Additional class names for the root container */
    className?: string;
}

interface MultiComboboxSingleProps extends MultiComboboxBaseProps {
    multiple?: false;
    /** Current value (controlled). Omit for uncontrolled. */
    value?: string | null;
    /** Initial value (uncontrolled). Ignored when `value` is provided. */
    defaultValue?: string | null;
    /** Called when selection changes */
    onValueChange?: (value: string | null) => void;
}

interface MultiComboboxMultipleProps extends MultiComboboxBaseProps {
    multiple: true;
    /** Current values (controlled). Omit for uncontrolled. */
    value?: string[];
    /** Initial values (uncontrolled). Ignored when `value` is provided. */
    defaultValue?: string[];
    /** Called when selection changes */
    onValueChange?: (value: string[]) => void;
}

export type MultiComboboxProps =
    | MultiComboboxSingleProps
    | MultiComboboxMultipleProps;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function MultiCombobox(props: MultiComboboxProps) {
    const {
        options,
        placeholder = 'Select...',
        selectedLabel,
        disabled = false,
        className,
    } = props;
    const isMultiple = props.multiple === true;

    // Controlled vs uncontrolled state
    const isControlled = props.value !== undefined;
    const [internalValue, setInternalValue] = React.useState<
        string | string[] | null
    >(() => {
        if (isControlled) return props.value ?? (isMultiple ? [] : null);
        if (props.defaultValue !== undefined) return props.defaultValue;
        return isMultiple ? [] : null;
    });

    const currentValue = isControlled ? props.value : internalValue;

    const handleValueChange = React.useCallback(
        (newValue: string | string[] | null) => {
            if (!isControlled) {
                setInternalValue(newValue);
            }
            if (isMultiple) {
                (props as MultiComboboxMultipleProps).onValueChange?.(
                    newValue as string[],
                );
            } else {
                (props as MultiComboboxSingleProps).onValueChange?.(
                    newValue as string | null,
                );
            }
        },
        [isControlled, isMultiple, props],
    );

    const [inputValue, setInputValue] = React.useState('');

    // Filter options by search input
    const filteredOptions = React.useMemo(() => {
        if (!inputValue) return options;
        const lower = inputValue.toLowerCase();
        return options.filter((o) => o.label.toLowerCase().includes(lower));
    }, [options, inputValue]);

    // --- Selection helpers ---

    const selectedValues: string[] =
        isMultiple ? ((currentValue as string[] | undefined) ?? [])
        : (currentValue as string | null | undefined) != null ?
            [currentValue as string]
        :   [];

    const isSelected = React.useCallback(
        (value: string) => selectedValues.includes(value),
        [selectedValues],
    );

    const toggleItem = React.useCallback(
        (option: MultiComboboxOption) => {
            if (isMultiple) {
                const current = (currentValue as string[] | undefined) ?? [];
                const next =
                    current.includes(option.value) ?
                        current.filter((v) => v !== option.value)
                    :   [...current, option.value];
                handleValueChange(next);
            } else {
                const current = currentValue as string | null | undefined;
                handleValueChange(
                    current === option.value ? null : option.value,
                );
            }
        },
        [isMultiple, currentValue, handleValueChange],
    );

    // --- Downshift multiple selection hook (chips) ---

    const selectedItems = React.useMemo(
        () => options.filter((o) => selectedValues.includes(o.value)),
        [options, selectedValues],
    );

    const { getDropdownProps } = useMultipleSelection({
        selectedItems,
        onStateChange({ selectedItems: newSelectedItems, type }) {
            if (
                type
                    === useMultipleSelection.stateChangeTypes
                        .SelectedItemKeyDownBackspace
                || type
                    === useMultipleSelection.stateChangeTypes
                        .SelectedItemKeyDownDelete
                || type
                    === useMultipleSelection.stateChangeTypes
                        .DropdownKeyDownBackspace
                || type
                    === useMultipleSelection.stateChangeTypes
                        .FunctionRemoveSelectedItem
            ) {
                if (isMultiple && newSelectedItems) {
                    handleValueChange(newSelectedItems.map((i) => i.value));
                }
            }
        },
    });

    // --- Downshift combobox hook ---

    const {
        isOpen,
        highlightedIndex,
        getInputProps,
        getToggleButtonProps,
        getMenuProps,
        getItemProps,
    } = useCombobox({
        items: filteredOptions,
        inputValue,
        itemToString: (item) => item?.label ?? '',
        selectedItem: null, // We manage selection ourselves
        isItemDisabled: (item) => !!item.disabled,
        stateReducer(_state, actionAndChanges) {
            const { changes, type } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                case useCombobox.stateChangeTypes.ItemClick:
                    return {
                        ...changes,
                        // In multiple mode, keep menu open and input value after selection
                        isOpen: isMultiple ? true : false,
                        inputValue: isMultiple ? inputValue : '',
                    };
                default:
                    return changes;
            }
        },
        onSelectedItemChange({ selectedItem: newItem }) {
            if (newItem) {
                toggleItem(newItem);
                if (!isMultiple) {
                    setInputValue('');
                }
            }
        },
        onInputValueChange({ inputValue: newValue }) {
            setInputValue(newValue ?? '');
        },
    });

    // --- Display label ---

    const compactLabel = selectedLabel ?? placeholder;

    const displayLabel = React.useMemo(() => {
        if (selectedItems.length === 0) return '';
        if (!isMultiple) return selectedItems[0]?.label ?? '';
        if (selectedItems.length === 1) return selectedItems[0]?.label ?? '';
        return `${compactLabel} (${selectedItems.length})`;
    }, [selectedItems, isMultiple, compactLabel]);

    const hasSelection = selectedItems.length > 0;

    const clearAll = React.useCallback(() => {
        handleValueChange(isMultiple ? [] : null);
        setInputValue('');
    }, [handleValueChange, isMultiple]);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const [triggerWidth, setTriggerWidth] = React.useState<
        number | undefined
    >();

    // Measure trigger width when dropdown opens
    React.useEffect(() => {
        if (isOpen && containerRef.current) {
            setTriggerWidth(containerRef.current.offsetWidth);
        }
    }, [isOpen]);

    return (
        <div
            ref={containerRef}
            data-slot='multi-combobox'
            className={cn('relative', className)}
        >
            {/* Trigger / Input */}
            <div
                className={cn(
                    'flex w-fit items-center gap-1 rounded-lg border border-input bg-transparent text-sm transition-colors',
                    'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
                    'hover:border-ring/50 hover:bg-muted/30',
                    disabled && 'pointer-events-none opacity-50',
                    isOpen && 'border-ring ring-3 ring-ring/50',
                )}
            >
                <input
                    {...getInputProps(
                        getDropdownProps({
                            disabled,
                            placeholder: displayLabel || placeholder,
                        }),
                    )}
                    className='h-8 min-w-[80px] flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground'
                />

                {hasSelection && !disabled && (
                    <button
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            clearAll();
                        }}
                        className='flex items-center px-1 opacity-50 hover:opacity-100'
                        aria-label='Clear selection'
                    >
                        <XIcon className='size-3.5' />
                    </button>
                )}

                <button
                    {...getToggleButtonProps({ disabled })}
                    type='button'
                    aria-label='toggle menu'
                    className='flex items-center px-2'
                >
                    <ChevronDownIcon
                        className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            isOpen && 'rotate-180',
                        )}
                    />
                </button>
            </div>

            {/* Dropdown */}
            <ul
                {...getMenuProps()}
                className={cn(
                    'absolute z-50 mt-1 max-h-60 w-full min-w-[var(--trigger-width)] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10',
                    !isOpen && 'hidden',
                )}
                style={
                    {
                        '--trigger-width':
                            triggerWidth ? `${triggerWidth}px` : 'auto',
                    } as React.CSSProperties
                }
            >
                {isOpen
                    && (filteredOptions.length === 0 ?
                        <li className='flex w-full justify-center py-2 text-center text-sm text-muted-foreground'>
                            No matches
                        </li>
                    :   filteredOptions.map((option, index) => {
                            const selected = isSelected(option.value);
                            return (
                                <li
                                    key={option.value}
                                    {...getItemProps({
                                        item: option,
                                        index,
                                    })}
                                    data-highlighted={
                                        highlightedIndex === index || undefined
                                    }
                                    data-selected={selected || undefined}
                                    className={cn(
                                        'relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none transition-colors duration-150',
                                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                                        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                                        option.disabled
                                            && 'pointer-events-none opacity-40 line-through',
                                    )}
                                >
                                    {option.label}
                                    {selected && (
                                        <span className='pointer-events-none absolute right-2 flex size-4 items-center justify-center'>
                                            <CheckIcon className='size-4' />
                                        </span>
                                    )}
                                </li>
                            );
                        }))}
            </ul>
        </div>
    );
}

export { MultiCombobox };
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && head -5 packages/shared/src/components/ui/perimeter/multi-combobox.tsx`
Expected: First line is `import * as React from 'react';` (no `"use client"` directive)

---

### Task 3: Export MultiCombobox from shared package

**Files:**

- Modify: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Add the export**

Add this line after the `combobox` export (after line 15):

```ts
export * from './ui/perimeter/multi-combobox';
```

- [ ] **Step 2: Verify typecheck passes for shared package**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm typecheck --filter=@perimeter-widgets/shared`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && git add packages/shared/package.json packages/shared/src/components/ui/perimeter/multi-combobox.tsx packages/shared/src/components/index.ts pnpm-lock.yaml && git commit -m "feat: port MultiCombobox component to shared package"
```

---

## Chunk 2: Update sermon filters to use MultiCombobox

### Task 4: Add setServiceTypes to use-sermon-filters hook

**Files:**

- Modify: `packages/widget-sermons/src/hooks/use-sermon-filters.ts`

- [ ] **Step 1: Add the setServiceTypes function**

Add after the `clearServiceTypes` function (after line 88):

```ts
const setServiceTypes = (ids: number[]) => {
    setParams({ serviceTypes: serializeServiceTypeIds(ids), page: 1 });
};
```

- [ ] **Step 2: Add setServiceTypes to the return object**

Add `setServiceTypes` to the return object (after `clearServiceTypes` on line 138):

```ts
setServiceTypes,
```

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm typecheck --filter=widget-sermons`
Expected: No errors

---

### Task 5: Replace SermonFilters dropdowns with MultiCombobox

**Files:**

- Modify: `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`

- [ ] **Step 1: Update imports**

Replace the entire imports block (lines 1-24, including type imports from `../../types`) with:

```tsx
import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Badge,
    Button,
    MultiCombobox,
} from '@perimeter-widgets/shared';
import type { MultiComboboxOption } from '@perimeter-widgets/shared';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import type {
    Speaker,
    Book,
    SeriesListItem,
    ServiceType,
    SortField,
    SortOrder,
} from '../../types';
```

- [ ] **Step 2: Update SermonFiltersProps interface**

Replace `onToggleServiceType` and `onClearServiceTypes` in the interface (lines 51-52):

Remove:

```ts
onToggleServiceType: (id: number) => void;
onClearServiceTypes: () => void;
```

Add:

```ts
onServiceTypesChange: (ids: number[]) => void;
```

- [ ] **Step 3: Update options to use MultiComboboxOption type**

Replace the options mapping block (lines 60-75) with:

```tsx
const seriesOptions: MultiComboboxOption[] = props.seriesList.map((s) => ({
    value: String(s.id),
    label: s.displayTitle ?? s.title,
}));
const speakerOptions: MultiComboboxOption[] = props.speakers.map((s) => ({
    value: String(s.id),
    label: s.name,
}));
const bookOptions: MultiComboboxOption[] = props.books.map((b) => ({
    value: String(b.id),
    label: b.name,
}));
const serviceTypeOptions: MultiComboboxOption[] = props.serviceTypes.map(
    (st) => ({
        value: String(st.id),
        label: st.name,
    }),
);
```

- [ ] **Step 4: Replace the three Select dropdowns with MultiCombobox**

Replace the three `<Select>` blocks (lines 91-159) with:

```tsx
<MultiCombobox
    options={seriesOptions}
    value={
        props.series != null
            ? String(props.series)
            : null
    }
    onValueChange={(v) =>
        props.onSeriesChange(
            v != null ? Number(v) : null,
        )
    }
    placeholder='All Series'
    disabled={props.seriesLoading}
/>
<MultiCombobox
    options={speakerOptions}
    value={
        props.speaker != null
            ? String(props.speaker)
            : null
    }
    onValueChange={(v) =>
        props.onSpeakerChange(
            v != null ? Number(v) : null,
        )
    }
    placeholder='All Speakers'
    disabled={props.speakersLoading}
/>
<MultiCombobox
    options={bookOptions}
    value={
        props.book != null
            ? String(props.book)
            : null
    }
    onValueChange={(v) =>
        props.onBookChange(
            v != null ? Number(v) : null,
        )
    }
    placeholder='All Books'
    disabled={props.booksLoading}
/>
```

- [ ] **Step 5: Replace ServiceTypeMultiSelect with MultiCombobox multiple**

Replace the `ServiceTypeMultiSelect` usage (lines 160-166):

```tsx
{
    props.showServiceTypeFilter && (
        <MultiCombobox
            options={serviceTypeOptions}
            value={props.selectedServiceTypeIds.map(String)}
            onValueChange={(v) => props.onServiceTypesChange(v.map(Number))}
            placeholder='Service Types'
            selectedLabel='Service Types'
            disabled={props.serviceTypesLoading}
            multiple
        />
    );
}
```

- [ ] **Step 6: Update active filter chip lookups and service type chip removal**

Since options now use string values, update the chip label lookups for series, speaker, and book to compare with `String(id)`. The existing chip code uses `o.value === props.series` etc., which is now `number === string` (always false). Fix all four chip sections:

For series chip (around line 213), change the find to:

```tsx
{
    seriesOptions.find((o) => o.value === String(props.series))?.label
        ?? 'Series';
}
```

For speaker chip (around line 227), change the find to:

```tsx
{
    speakerOptions.find((o) => o.value === String(props.speaker))?.label
        ?? 'Speaker';
}
```

For book chip (around line 240), change the find to:

```tsx
{
    bookOptions.find((o) => o.value === String(props.book))?.label ?? 'Book';
}
```

For service type chips, replace the entire block (lines 246-260) to use `onServiceTypesChange`:

```tsx
{
    props.selectedServiceTypeIds.map((id) => (
        <button
            key={id}
            type='button'
            onClick={() =>
                props.onServiceTypesChange(
                    props.selectedServiceTypeIds.filter((x) => x !== id),
                )
            }
            className='inline-flex'
        >
            <Badge variant='default'>
                {serviceTypeOptions.find((o) => o.value === String(id))?.label
                    ?? 'Service Type'}{' '}
                <X className='h-3 w-3' />
            </Badge>
        </button>
    ));
}
```

Note: The chip lookup now compares `o.value === String(id)` since options use string values.

- [ ] **Step 7: Delete the ServiceTypeMultiSelect function**

Remove the entire `ServiceTypeMultiSelect` function (lines 279-340). Also remove `useRef` and `useEffect` from the React import on line 1 since they are no longer used (only `useState` remains for `showMore`).

---

### Task 6: Update SermonsView to pass new props

**Files:**

- Modify: `packages/widget-sermons/src/components/sermons/SermonsView.tsx`

- [ ] **Step 1: Replace service type props**

In the `<SermonFilters>` JSX (around lines 126-155), replace:

```tsx
onToggleServiceType={filters.toggleServiceType}
onClearServiceTypes={filters.clearServiceTypes}
```

With:

```tsx
onServiceTypesChange={filters.setServiceTypes}
```

---

### Task 7: Verify and commit

- [ ] **Step 1: Run typecheck for widget-sermons**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm typecheck --filter=widget-sermons`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm test --filter=widget-sermons`
Expected: All tests pass

- [ ] **Step 3: Run full quality check**

Run: `cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm quality`
Expected: All checks pass (typecheck + lint + format + test)

- [ ] **Step 4: Fix any lint/format issues**

If quality check reports formatting issues in files we touched:

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && pnpm prettier --write packages/widget-sermons/src/components/sermons/SermonFilters.tsx packages/widget-sermons/src/components/sermons/SermonsView.tsx packages/widget-sermons/src/hooks/use-sermon-filters.ts
```

- [ ] **Step 5: Commit**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets && git add packages/widget-sermons/src/hooks/use-sermon-filters.ts packages/widget-sermons/src/components/sermons/SermonFilters.tsx packages/widget-sermons/src/components/sermons/SermonsView.tsx && git commit -m "feat: replace sermon filter dropdowns with MultiCombobox

Replaces Select dropdowns (Series, Speaker, Book) and the hand-rolled
ServiceTypeMultiSelect with the new MultiCombobox component. Adds
type-ahead search and keyboard navigation to all filter dropdowns."
```

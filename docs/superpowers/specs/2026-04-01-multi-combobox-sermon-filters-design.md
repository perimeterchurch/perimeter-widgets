# MultiCombobox Integration in Sermon Filters

**Date:** 2026-04-01
**Status:** Approved
**Scope:** `@perimeter-widgets/shared`, `widget-sermons`

---

## Summary

Port the `MultiCombobox` component from the style registry into the shared package and replace all four filter dropdowns in `SermonFilters` (Series, Speaker, Book, ServiceType) with it. Single-select mode for Series/Speaker/Book, multi-select mode for ServiceType.

## Motivation

- The style registry has a new `MultiCombobox` component (built on `downshift`) that supports single and multi-select with type-ahead search
- `SermonFilters` currently uses `Select` dropdowns (no search) for Series/Speaker/Book and a hand-rolled `ServiceTypeMultiSelect` with manual click-outside handling, no keyboard navigation, and no search
- Speakers and series lists can be long — type-ahead search significantly improves usability

## Changes

### 1. Add `downshift` dependency to shared package

Add `downshift` to `packages/shared/package.json` dependencies.

### 2. Port MultiCombobox to shared package

Create `packages/shared/src/components/ui/perimeter/multi-combobox.tsx`:

- Copy from `style/registry/ui/perimeter/multi-combobox.tsx`
- Remove `"use client"` directive (shared package is not a Next.js app)
- Change `cn` import from `@/lib/utils` to `../../../lib/utils`
- No shadow DOM portal needed — the dropdown uses absolute positioning within the component, not a portal

Export from `packages/shared/src/components/index.ts`.

### 3. Replace SermonFilters dropdowns

In `packages/widget-sermons/src/components/sermons/SermonFilters.tsx`:

**Series filter** — Replace `Select` with `<MultiCombobox>` single-select:

- `options`: map `seriesList` to `{ value: String(id), label: displayTitle ?? title }`
- `value`: `series != null ? String(series) : null`
- `onValueChange`: convert back to `number | null` and call `onSeriesChange`
- `placeholder`: `"All Series"`

**Speaker filter** — Same pattern:

- `options`: map `speakers` to `{ value: String(id), label: name }`
- `placeholder`: `"All Speakers"`

**Book filter** — Same pattern:

- `options`: map `books` to `{ value: String(id), label: name }`
- `placeholder`: `"All Books"`

**ServiceType filter** — Replace `ServiceTypeMultiSelect` with `<MultiCombobox multiple>`:

- `options`: map `serviceTypes` to `{ value: String(id), label: name }`
- `value`: `selectedServiceTypeIds.map(String)`
- `onValueChange`: convert string[] back to number[], reconcile with existing toggle/clear callbacks
- `placeholder`: `"Service Types"`
- `selectedLabel`: `"Service Types"`

### 4. Delete ServiceTypeMultiSelect

Remove the `ServiceTypeMultiSelect` function from `SermonFilters.tsx`. Remove unused imports (`useState`, `useRef`, `useEffect`, `Checkbox`).

### 5. Update SermonFilters imports

Remove: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `Checkbox`
Add: `MultiCombobox`, `type MultiComboboxOption`

### 6. Add `setServiceTypes` to `use-sermon-filters.ts`

The hook currently exposes `toggleServiceType(id)` and `clearServiceTypes()`. MultiCombobox's `onValueChange` returns the full `string[]`. Add a `setServiceTypes(ids: number[])` that writes the full array at once:

```ts
const setServiceTypes = (ids: number[]) => {
    setParams({ serviceTypes: serializeServiceTypeIds(ids), page: 1 });
};
```

Export it and use it in `SermonFiltersProps` as `onServiceTypesChange: (ids: number[]) => void`, replacing `onToggleServiceType` and `onClearServiceTypes`.

### 7. Update SermonsView.tsx

Update the parent component that renders `SermonFilters` to pass `setServiceTypes` as `onServiceTypesChange` instead of `toggleServiceType`/`clearServiceTypes`.

## Interface changes

`SermonFiltersProps` changes:

- **Remove:** `onToggleServiceType`, `onClearServiceTypes`
- **Add:** `onServiceTypesChange: (ids: number[]) => void`
- **Keep:** `selectedServiceTypeIds` (still needed for active filter chips)

The parent (`SermonsView`) passes `setServiceTypes` instead of `toggleServiceType`/`clearServiceTypes`.

Service type chip removal buttons use: `onServiceTypesChange(selectedServiceTypeIds.filter(x => x !== id))`.

## Loading states

Pass `disabled={loading}` to MultiCombobox for each filter while its data is loading. The existing `seriesLoading`, `speakersLoading`, `booksLoading`, `serviceTypesLoading` props drive this.

## Testing

- Existing `App.test.tsx` should still pass (filters are behind user interaction)
- Manual verification in storyboard: type-ahead search works, single-select clears on re-select, multi-select toggles, keyboard navigation works
- `pnpm quality` must pass across both packages

## Bundle impact

`downshift` adds ~12kb gzipped. This is acceptable given it replaces both base-ui Select usage in filters and the hand-rolled multi-select.

Note: The `Select` component import from shared is only removed from `SermonFilters` — other files may still use it, so the Select component itself stays in the shared package.

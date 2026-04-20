# Component Interactivity & Animation Improvements — Design Spec

## Overview

Improve the interactive feel of all 55 registry components and site chrome. Add missing cursor pointers, hover/focus states, smooth transitions, and a sliding tab indicator. Fix the progress component rendering and improve theme switcher discoverability.

**Animation style:** Subtle + warm. 150-250ms transitions with gentle easing (`ease-out` or `cubic-bezier(0.4, 0, 0.2, 1)`). Micro-interactions that feel responsive and inviting.

## 1. Cursor Pointer Additions

Add `cursor-pointer` to non-menu standalone interactive elements. Menu items (dropdown-menu, context-menu, menubar, command, combobox, select) keep `cursor-default` following macOS native conventions.

| Component       | File                                        | Element              | Change               |
| --------------- | ------------------------------------------- | -------------------- | -------------------- |
| accordion       | `registry/ui/perimeter/accordion.tsx`       | `AccordionTrigger`   | Add `cursor-pointer` |
| pagination      | `registry/ui/perimeter/pagination.tsx`      | `PaginationLink`     | Add `cursor-pointer` |
| navigation-menu | `registry/ui/perimeter/navigation-menu.tsx` | `NavigationMenuLink` | Add `cursor-pointer` |
| calendar        | `registry/ui/perimeter/calendar.tsx`        | `CalendarDayButton`  | Add `cursor-pointer` |
| item            | `registry/ui/perimeter/item.tsx`            | `Item` root element  | Add `cursor-pointer` |

Collapsible triggers use render props (consumers pass their own Button), so no cursor change needed there. Table rows are not always clickable, so no cursor change.

## 2. Hover + Focus States

### Form Inputs

**Files:** `input.tsx`, `textarea.tsx`, `native-select.tsx`

Add to the base input/textarea classes:

- Hover: `hover:border-ring/50 hover:bg-muted/30`
- The existing `focus-visible:ring` stays. Add `focus:bg-background` to clear the hover background tint when the field is focused.
- All with `transition-colors duration-150`

### Scroll Area Thumb

**File:** `scroll-area.tsx`

The scrollbar track is `w-2.5` with the thumb as a `flex-1` child inside it. Changes apply to the **thumb** element specifically (not the track):

- Add explicit width to thumb: `w-1.5` (narrower than the track, centered)
- Add `opacity-60` as default
- Hover on the **scrollbar** (parent): `group-hover:w-2 group-hover:opacity-100` on the thumb
- Add `transition-all duration-200` to the thumb

The track stays `w-2.5`. The thumb grows from 6px to 8px within the track on hover.

### Resizable Handle

**File:** `resizable.tsx`

- Add `hover:bg-primary/20` to the handle element
- The grip dots (if present) should increase opacity on hover
- Add `transition-all duration-200`

### Input OTP Slots

**File:** `input-otp.tsx`

- Add `hover:border-ring/50` to `InputOTPSlot`
- Add `transition-colors duration-150`

### Calendar Day Buttons

**File:** `calendar.tsx`

- Add `transition-colors duration-150` to `CalendarDayButton` for smoother hover and selection state changes

### Item Component

**File:** `item.tsx`

- Add `transition-colors duration-150` to the root element for hover state

### Pagination Links

**File:** `pagination.tsx`

- Add `transition-colors duration-150` to `PaginationLink` for hover/active states

## 3. Transitions & Animations

### Collapsible Content Animation

**File:** `collapsible.tsx`

Add `animate-accordion-down` (opening) and `animate-accordion-up` (closing) to `CollapsibleContent`, matching the accordion's expand/collapse animation. These keyframes already exist from tw-animate-css / the accordion component.

Use data attributes from base-ui (`data-open`, `data-closed`) to toggle between the two animations.

### Sliding Tab Indicator

**File:** `tabs.tsx` (already a `"use client"` module)

**Applies to the `line` variant only.** The `default` variant uses background/shadow fills and does not have an underline indicator — it stays as-is.

Replace the current `::after` pseudo-element underline on `TabsTrigger` (line variant) with a separate positioned `<span>` element that slides between tabs:

- Add a `TabsIndicator` component (a positioned `<span>` inside `TabsList`)
- Use refs to measure the active tab's `offsetLeft` and `offsetWidth`
- Animate with `transform: translateX()` + `width` transitions (200ms ease-out)
- The indicator lives inside `TabsList`, absolutely positioned at the bottom
- On tab change, recalculate position and animate
- On initial render, position instantly (no animation on mount)
- Use `ResizeObserver` on the tab list to recalculate if tab widths change (responsive layouts)

**Vertical tabs:** For `data-orientation="vertical"`, use `offsetTop` / `offsetHeight` and `translateY` instead of `translateX` / `width`. The indicator is positioned on the right edge instead of the bottom.

Remove the existing `::after` pseudo-element styles from `TabsTrigger` for the `line` variant since the new indicator replaces them.

### Select / Combobox / Command Item Highlighting

**Files:** `select.tsx`, `combobox.tsx`, `command.tsx`

Add `transition-colors duration-150` to item elements so the `data-highlighted` / `data-selected` background color changes are smooth rather than instant.

### Progress Indicator Animation & Fix

**File:** `progress.tsx` and/or `progress.demo.tsx`

Base-ui's `Progress.Indicator` sets width via inline styles automatically from the context value. The progress bar is not rendering in the showcase preview — this is NOT a missing width style issue. Possible causes:

- CSS conflict (the `h-full` on the indicator may collapse if the track has no explicit height context)
- The indicator's background may not be visible against the track
- The demo's playground wrapper may be interfering

**Fix:** Debug by inspecting the rendered DOM in the preview. The fix will depend on what's actually wrong — do not assume the cause.

**Animation improvement:** Once rendering is fixed, change `transition-all` on the indicator to `transition-all duration-500 ease-out` for smoother fill animation when value changes.

## 4. Theme Switcher Visibility

**File:** `src/components/site/theme-switcher.tsx`

- Add a `Palette` icon (from lucide-react) before the select trigger content
- Add `border-primary/30` to the trigger to visually distinguish it from plain form inputs
- This makes the theme switcher more discoverable in the nav bar

## 5. Site Chrome Cursor Fixes

**File:** `src/components/site/top-nav.tsx`

- Nav links already have `transition-colors` and hover state — add `cursor-pointer` explicitly

## What's NOT Changing

- Menu items (dropdown, context, menubar, command, combobox, select items) keep `cursor-default`
- Dialog/Sheet/Drawer overlays — these are overlays, not interactive targets
- Tooltip/Popover/HoverCard triggers — these use render props, consumers control the trigger element
- Button, Badge, Toggle, Switch, Checkbox, Radio — already have excellent interactivity

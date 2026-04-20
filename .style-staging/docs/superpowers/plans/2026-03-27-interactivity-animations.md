# Interactivity & Animation Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing cursor pointers, hover/focus states, smooth transitions, a sliding tab indicator, and fix the progress component across all registry components and site chrome.

**Architecture:** Direct edits to Tailwind className strings in registry components. One new client-side wrapper for the sliding tab indicator. All changes are CSS-level — no new dependencies, no API changes, no breaking changes for consumers.

**Tech Stack:** Tailwind CSS v4, tw-animate-css, base-ui React primitives, class-variance-authority.

**Spec:** `docs/superpowers/specs/2026-03-27-interactivity-animations-design.md`

---

## Chunk 1: Cursor Pointers, Hover/Focus States, Simple Transitions

This chunk adds cursor-pointer, hover/focus states to form inputs, and transition-colors to components missing smooth state changes. All changes are single-line className edits.

### Task 1: Add cursor-pointer to standalone interactive elements

**Files:**

- Modify: `registry/ui/perimeter/accordion.tsx`
- Modify: `registry/ui/perimeter/pagination.tsx`
- Modify: `registry/ui/perimeter/navigation-menu.tsx`
- Modify: `registry/ui/perimeter/calendar.tsx`
- Modify: `registry/ui/perimeter/item.tsx`

- [ ] **Step 1: Add cursor-pointer to AccordionTrigger**

In `accordion.tsx`, find the AccordionTrigger className string. Add `cursor-pointer` after `text-sm font-medium`.

The className currently starts with:

```
"group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline
```

Add `cursor-pointer` so it becomes:

```
"group/accordion-trigger relative flex flex-1 cursor-pointer items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline
```

- [ ] **Step 2: Add cursor-pointer to PaginationLink**

In `pagination.tsx`, the `PaginationLink` uses a `Button` component. Add `cursor-pointer` to the Button's className:

Change: `className={cn(className)}`
To: `className={cn("cursor-pointer", className)}`

- [ ] **Step 3: Add cursor-pointer to NavigationMenuLink**

In `navigation-menu.tsx`, find the NavigationMenuLink className. Add `cursor-pointer` at the start of the string.

- [ ] **Step 4: Add cursor-pointer to CalendarDayButton**

In `calendar.tsx`, find the CalendarDayButton className. Add `cursor-pointer` at the start of the className string.

- [ ] **Step 5: Add cursor-pointer to Item component**

In `item.tsx`, find the `itemVariants` cva base string. Add `cursor-pointer` after `rounded-lg border`.

- [ ] **Step 6: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add registry/ui/perimeter/accordion.tsx registry/ui/perimeter/pagination.tsx registry/ui/perimeter/navigation-menu.tsx registry/ui/perimeter/calendar.tsx registry/ui/perimeter/item.tsx
git commit -m "feat: add cursor-pointer to accordion, pagination, nav-menu, calendar, item"
```

### Task 2: Add hover/focus states to form inputs

**Files:**

- Modify: `registry/ui/perimeter/input.tsx`
- Modify: `registry/ui/perimeter/textarea.tsx`
- Modify: `registry/ui/perimeter/native-select.tsx`

- [ ] **Step 1: Update Input className**

In `input.tsx`, find the className string on the InputPrimitive. Add `hover:border-ring/50 hover:bg-muted/30 focus:bg-background` after `transition-colors`.

The area around `transition-colors` currently reads:

```
...text-base transition-colors outline-none file:inline-flex...
```

Change to:

```
...text-base transition-colors hover:border-ring/50 hover:bg-muted/30 focus:bg-background outline-none file:inline-flex...
```

- [ ] **Step 2: Update Textarea className**

Same pattern. In `textarea.tsx`, add `hover:border-ring/50 hover:bg-muted/30 focus:bg-background` after `transition-colors`.

- [ ] **Step 3: Update NativeSelect className**

In `native-select.tsx`, the `<select>` element className. Add `hover:border-ring/50 hover:bg-muted/30 focus:bg-background` after `transition-colors`.

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/input.tsx registry/ui/perimeter/textarea.tsx registry/ui/perimeter/native-select.tsx
git commit -m "feat: add hover/focus states to input, textarea, native-select"
```

### Task 3: Add transition-colors to components with abrupt state changes

**Files:**

- Modify: `registry/ui/perimeter/select.tsx`
- Modify: `registry/ui/perimeter/combobox.tsx`
- Modify: `registry/ui/perimeter/command.tsx`
- Modify: `registry/ui/perimeter/input-otp.tsx`
- Modify: `registry/ui/perimeter/item.tsx` (if not already has transition — it does: `transition-colors duration-100`, change to `duration-150`)

- [ ] **Step 1: Add transition-colors to SelectItem**

In `select.tsx`, find the SelectItem className. Add `transition-colors duration-150` after `select-none`.

- [ ] **Step 2: Add transition-colors to ComboboxItem**

In `combobox.tsx`, find the ComboboxItem className. Add `transition-colors duration-150` after `select-none`.

- [ ] **Step 3: Add transition-colors to CommandItem**

In `command.tsx`, find the CommandItem className. Add `transition-colors duration-150` after `select-none`.

- [ ] **Step 4: Add hover state to InputOTPSlot**

In `input-otp.tsx`, find the InputOTPSlot className. Add `hover:border-ring/50` after `transition-all`.

- [ ] **Step 5: Add transition-colors to CalendarDayButton**

In `calendar.tsx`, add `transition-colors duration-150` to the CalendarDayButton className.

- [ ] **Step 6: Add transition-colors to PaginationLink**

Already handled by Button component — verify it inherits `transition-all`. No change needed if Button already provides it.

- [ ] **Step 7: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 8: Commit**

```bash
git add registry/ui/perimeter/select.tsx registry/ui/perimeter/combobox.tsx registry/ui/perimeter/command.tsx registry/ui/perimeter/input-otp.tsx registry/ui/perimeter/calendar.tsx
git commit -m "feat: add transition-colors to select, combobox, command, input-otp, calendar items"
```

### Task 4: Enhance scroll area thumb and resizable handle

**Files:**

- Modify: `registry/ui/perimeter/scroll-area.tsx`
- Modify: `registry/ui/perimeter/resizable.tsx`

- [ ] **Step 1: Update ScrollBar and thumb styling**

In `scroll-area.tsx`, make the ScrollBar a group so the thumb can respond to parent hover. Update the ScrollBar className to add `group/scrollbar`.

Update the Thumb className from:

```
"relative flex-1 rounded-full bg-border"
```

To:

```
"relative flex-1 rounded-full bg-border opacity-60 transition-all duration-200 group-hover/scrollbar:opacity-100 data-horizontal:h-1.5 data-horizontal:group-hover/scrollbar:h-2 data-vertical:w-1.5 data-vertical:group-hover/scrollbar:w-2"
```

Note: The data-horizontal/data-vertical attributes come from the parent ScrollBar's `data-orientation`.

- [ ] **Step 2: Update ResizableHandle hover state**

In `resizable.tsx`, find the ResizableHandle className. Add `transition-colors duration-200 hover:bg-primary/20` after the existing className.

Also update the grip dots div (the `withHandle` div):
Change: `"z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border"`
To: `"z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border transition-colors duration-200 group-hover:bg-primary/40"`

And add `group` to the ResizableHandle's `Separator` component className.

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add registry/ui/perimeter/scroll-area.tsx registry/ui/perimeter/resizable.tsx
git commit -m "feat: add hover animations to scroll-area thumb and resizable handle"
```

---

## Chunk 2: Collapsible Animation, Progress Fix, Theme Switcher, Nav

This chunk adds the collapsible expand/collapse animation, fixes the progress component, improves theme switcher visibility, and adds cursor-pointer to nav links.

### Task 5: Add collapsible content animation

**Files:**

- Modify: `registry/ui/perimeter/collapsible.tsx`

- [ ] **Step 1: Add cn import and animation classes to CollapsibleContent**

The current CollapsibleContent has no className at all. Import `cn` and add the accordion animation classes:

```typescript
"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden data-[open]:animate-accordion-down data-[closed]:animate-accordion-up",
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add registry/ui/perimeter/collapsible.tsx
git commit -m "feat: add expand/collapse animation to collapsible content"
```

### Task 6: Fix progress component rendering

**Files:**

- Modify: `registry/ui/perimeter/progress.tsx`

- [ ] **Step 1: Debug and fix the progress indicator**

The issue is likely that `overflow-x-hidden` on the track should be `overflow-hidden` (both axes), and the indicator may need `rounded-full` to match the track.

Update ProgressTrack className:
Change `overflow-x-hidden` to `overflow-hidden`

Update ProgressIndicator className:
Change: `"h-full bg-primary transition-all"`
To: `"h-full rounded-full bg-primary transition-all duration-500 ease-out"`

- [ ] **Step 2: Verify the progress renders in the showcase**

Run: `pnpm dev --webpack`, navigate to `/components/data-display/progress`
Expected: Progress bar renders with filled indicator.

- [ ] **Step 3: Commit**

```bash
git add registry/ui/perimeter/progress.tsx
git commit -m "fix: progress indicator rendering and smoother fill animation"
```

### Task 7: Improve theme switcher visibility

**Files:**

- Modify: `src/components/site/theme-switcher.tsx`

- [ ] **Step 1: Add Palette icon and visual emphasis**

```typescript
"use client";

import { PaletteIcon } from "lucide-react";

import { useTheme } from "@/lib/theme-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatThemeName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <Select
      value={theme}
      onValueChange={(value: string | null) => setTheme(value ?? "")}
    >
      <SelectTrigger className="w-[160px] h-8 gap-1.5 border-primary/30 text-xs">
        <PaletteIcon className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Default" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Default</SelectItem>
        {availableThemes.map((t) => (
          <SelectItem key={t} value={t}>
            {formatThemeName(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/site/theme-switcher.tsx
git commit -m "feat: add palette icon and visual emphasis to theme switcher"
```

### Task 8: Add cursor-pointer to nav links

**Files:**

- Modify: `src/components/site/top-nav.tsx`

- [ ] **Step 1: Add cursor-pointer to nav links**

In `top-nav.tsx`, the Link elements have `"text-muted-foreground hover:text-foreground transition-colors"`. Add `cursor-pointer`:

```
"cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
```

- [ ] **Step 2: Commit**

```bash
git add src/components/site/top-nav.tsx
git commit -m "feat: add cursor-pointer to top nav links"
```

---

## Chunk 3: Sliding Tab Indicator

This is the most complex piece — replacing the pseudo-element underline with a sliding animated indicator for the `line` variant.

### Task 9: Implement sliding tab indicator

**Files:**

- Modify: `registry/ui/perimeter/tabs.tsx`

- [ ] **Step 1: Rewrite TabsList for the line variant with a sliding indicator**

The `TabsList` component needs to:

1. Detect when it's using the `line` variant
2. Track the active tab's position via refs
3. Render a positioned `<span>` that animates between tabs
4. Handle both horizontal and vertical orientations
5. Use ResizeObserver to recalculate on layout changes
6. Skip animation on initial render

Replace the current `TabsList` and `TabsTrigger` with updated versions:

```typescript
"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({
    opacity: 0,
  });
  const isFirstRender = useRef(true);

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list || variant !== "line") return;

    const activeTab = list.querySelector<HTMLElement>("[data-active]");
    if (!activeTab) {
      setIndicatorStyle({ opacity: 0 });
      return;
    }

    const isVertical =
      list.closest("[data-orientation=vertical]") !== null;

    const style: CSSProperties = {
      position: "absolute",
      borderRadius: "9999px",
      backgroundColor: "var(--foreground)",
      transition: isFirstRender.current
        ? "none"
        : "transform 200ms ease-out, width 200ms ease-out, height 200ms ease-out",
      opacity: 1,
    };

    if (isVertical) {
      style.right = "-4px";
      style.width = "2px";
      style.height = `${activeTab.offsetHeight * 0.6}px`;
      style.transform = `translateY(${activeTab.offsetTop + activeTab.offsetHeight * 0.2}px)`;
    } else {
      style.bottom = "-4px";
      style.height = "2px";
      style.width = `${activeTab.offsetWidth * 0.6}px`;
      style.transform = `translateX(${activeTab.offsetLeft + activeTab.offsetWidth * 0.2}px)`;
    }

    setIndicatorStyle(style);
    isFirstRender.current = false;
  }, [variant]);

  useEffect(() => {
    updateIndicator();

    const list = listRef.current;
    if (!list || variant !== "line") return;

    const observer = new MutationObserver(updateIndicator);
    observer.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-active"],
    });

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(list);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [updateIndicator, variant]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {props.children}
      {variant === "line" && (
        <span
          data-slot="tabs-indicator"
          style={indicatorStyle}
          aria-hidden
        />
      )}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
```

Key changes:

- `TabsList` now uses `useRef` to track the list element
- A `MutationObserver` watches for `data-active` attribute changes on child tabs
- A `ResizeObserver` recalculates on layout changes
- The indicator `<span>` is absolutely positioned and transitions `transform` + size
- First render skips animation (`isFirstRender` ref)
- The old `::after` pseudo-element styles on `TabsTrigger` are removed (the fourth className line)
- Vertical orientation uses `translateY` + `height` instead of `translateX` + `width`
- Indicator width/height is 60% of the tab, centered (the `* 0.2` offset)

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`

- [ ] **Step 3: Verify the sliding indicator works**

Run: `pnpm dev --webpack`, navigate to `/components/navigation/tabs`
Expected: Clicking between tabs shows a smooth sliding underline for the line variant. Default variant should still use background fills, no underline.

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: All routes generate successfully.

- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/tabs.tsx
git commit -m "feat: sliding tab indicator for line variant with resize/orientation support"
```

### Task 10: Final verification

- [ ] **Step 1: Run full quality check**

Run: `pnpm generate:themes && pnpm collect:demos && pnpm quality`
Expected: typecheck + lint + format:check all pass. If format fails, run `pnpm prettier --write` on affected files.

- [ ] **Step 2: Run full build**

Run: `pnpm build`
Expected: All 75 routes generated.

- [ ] **Step 3: Format any changed files**

Run: `pnpm prettier --write registry/ui/perimeter/accordion.tsx registry/ui/perimeter/pagination.tsx registry/ui/perimeter/navigation-menu.tsx registry/ui/perimeter/calendar.tsx registry/ui/perimeter/item.tsx registry/ui/perimeter/input.tsx registry/ui/perimeter/textarea.tsx registry/ui/perimeter/native-select.tsx registry/ui/perimeter/scroll-area.tsx registry/ui/perimeter/resizable.tsx registry/ui/perimeter/select.tsx registry/ui/perimeter/combobox.tsx registry/ui/perimeter/command.tsx registry/ui/perimeter/input-otp.tsx registry/ui/perimeter/collapsible.tsx registry/ui/perimeter/tabs.tsx registry/ui/perimeter/progress.tsx src/components/site/theme-switcher.tsx src/components/site/top-nav.tsx`

- [ ] **Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: format modified component files"
```

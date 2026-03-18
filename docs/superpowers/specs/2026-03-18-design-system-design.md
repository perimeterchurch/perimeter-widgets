# Design System for Perimeter Widgets

> **Date:** 2026-03-18
> **Status:** Approved
> **Scope:** Design tokens, primitive components, motion system, Storybook documentation, dark mode, runtime customization

---

## Overview

Establish a comprehensive design system for the widgets monorepo that mirrors the perimeter-api's component library, adapted for shadow DOM isolation. The system provides a standardized theme using Perimeter Church brand colors, 15 primitive components, a Framer Motion animation system, dark mode via `data-theme` attribute, runtime token overrides via CSS custom properties, and full Storybook documentation.

---

## Approach

**Two-layer token architecture with CSS custom properties and Tailwind v4.**

Design tokens exist at two levels:

1. **Runtime tokens** — CSS custom properties defined on `:host` (and `.storybook-root` for Storybook compatibility). These are the source of truth for colors, spacing, typography, etc. Dark mode overrides swap these via `:host([data-theme="dark"])`. WordPress admins can override any token via inline `style` on the embed `<div>`, since CSS custom properties set on the shadow host inherit into the shadow tree.

2. **Tailwind `@theme` block** — uses hardcoded hex values (not `var()` references) because Tailwind v4 requires static values at build time for utility class generation. The `@theme` values match the `:host` light mode defaults.

**How components use tokens:**
- Most styling uses standard Tailwind utility classes (`bg-primary`, `text-stone-900`, `rounded-lg`) — these cover ~95% of cases and are static.
- For the handful of tokens that must be runtime-overridable (brand colors, key surface colors), components use Tailwind arbitrary value syntax: `bg-[var(--color-primary)]`. This ensures WordPress overrides take effect.
- The `variants.ts` centralized mappings use the arbitrary value syntax for semantic color tokens so runtime overrides work through the variant system.

**Dark mode** uses `data-theme="dark"` on an inner wrapper div inside the shadow root (not on `:host`), enabling a `@custom-variant` selector that works in both shadow DOM and Storybook.

**Why this approach:**
- CSS custom properties on the shadow host enable runtime overrides from WordPress
- Tailwind utility generation works with static `@theme` values
- `data-theme` on inner wrapper avoids `:host()` selector limitations in `@custom-variant`
- Storybook compatibility without shadow DOM emulation
- Zero JS overhead for theming — no providers, no re-renders

---

## 1. Token Architecture

### File: `packages/shared/src/styles/tokens.css`

Expand from the current minimal token set to match the API's full token system.

### Two-Layer Structure

**Layer 1: Runtime CSS custom properties** on `:host` and `.storybook-root`:

```css
:host,
.storybook-root {
    /* Primary: warm indigo */
    --color-primary: #5b5bd6;
    --color-primary-hover: #4e4eca;
    --color-primary-active: #4242b8;
    --color-primary-foreground: #ffffff;
    /* ... all tokens */
}

:host([data-theme="dark"]),
.storybook-root[data-theme="dark"] {
    --color-background: #0c0a09;
    --color-foreground: #fafaf9;
    /* ... dark overrides */
}
```

**Layer 2: Tailwind `@theme` block** with static hex values:

```css
@theme {
    --color-primary: #5b5bd6;
    --color-primary-hover: #4e4eca;
    /* ... matching light mode defaults */
}
```

### Canonical Values

All hex values are taken from the **API's `tokens.css`** as the canonical source. Where current widget tokens differ (e.g., `--color-primary-hover` is `#4e4ec2` in widgets vs `#4e4eca` in API), the API values win.

### Token Categories

**Semantic Colors** (with hover/active/foreground variants):
- Primary: warm indigo (`#5b5bd6`, hover `#4e4eca`, active `#4242b8`, foreground `#ffffff`)
- Success: warm green (`#46a758`, hover `#3d9b4f`, active `#348746`, foreground `#ffffff`)
- Warning: warm amber (`#f5a623`, hover `#e09918`, active `#c88a14`, foreground `#ffffff`)
- Error: warm rose (`#e54666`, hover `#d93d5c`, active `#c63652`, foreground `#ffffff`)

**Surface Colors (light / dark):**

| Token | Light | Dark |
|---|---|---|
| `--color-background` | `#ffffff` | `#0c0a09` |
| `--color-foreground` | `#1c1917` | `#fafaf9` |
| `--color-card` | `#ffffff` | `#1c1917` |
| `--color-card-foreground` | `#1c1917` | `#fafaf9` |
| `--color-muted` | `#f5f5f4` | `#292524` |
| `--color-muted-foreground` | `#78716c` | `#a8a29e` |
| `--color-accent` | `#f5f5f4` | `#292524` |
| `--color-accent-foreground` | `#1c1917` | `#fafaf9` |
| `--color-popover` | `#ffffff` | `#1c1917` |
| `--color-popover-foreground` | `#1c1917` | `#fafaf9` |
| `--color-destructive` | `#e54666` | `#e54666` |
| `--color-destructive-foreground` | `#ffffff` | `#ffffff` |
| `--color-border` | `#d6d3d1` | `#44403c` |
| `--color-input` | `#d6d3d1` | `#44403c` |
| `--color-ring` | `#5b5bd6` | `#5b5bd6` |

**Base Scale Tokens** (also ported from API, for direct use):

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#fafaf9` | `#0c0a09` |
| `--color-bg-subtle` | `#f5f5f4` | `#1c1917` |
| `--color-bg-muted` | `#e7e5e4` | `#292524` |
| `--color-border-subtle` | `#e7e5e4` | `#292524` |
| `--color-text` | `#1c1917` | `#fafaf9` |
| `--color-text-secondary` | `#57534e` | `#a8a29e` |
| `--color-text-muted` | `#a8a29e` | `#78716c` |

**Spacing Scale:**
- `--spacing-xs` (0.5rem / 8px)
- `--spacing-sm` (0.75rem / 12px)
- `--spacing-md` (1rem / 16px)
- `--spacing-lg` (1.5rem / 24px)
- `--spacing-xl` (2rem / 32px)
- `--spacing-2xl` (3rem / 48px)
- `--spacing-3xl` (4rem / 64px)

**Typography:**
- Font families:
  - `--font-sans`: `ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'` (matches API)
  - `--font-mono`: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`
- Font sizes: `--font-size-xs` (0.75rem) through `--font-size-4xl` (2.25rem)
- Font weights: `--font-weight-normal` (400), `--font-weight-medium` (500), `--font-weight-semibold` (600), `--font-weight-bold` (700)
- Line heights: `--line-height-tight` (1.25), `--line-height-normal` (1.5), `--line-height-relaxed` (1.75)

**Border Radius:**
- `--radius-none` (0), `--radius-sm` (0.375rem), `--radius-md` (0.5rem), `--radius-lg` (0.75rem), `--radius-xl` (1rem), `--radius-2xl` (1.5rem), `--radius-full` (9999px)

**Shadows** (warm stone-tinted, matching API):
- `--shadow-xs` through `--shadow-2xl` with dark mode overrides using stronger opacity

**Transitions:**
- `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-slow` (300ms)
- All use `cubic-bezier(0.4, 0, 0.2, 1)`

**Z-Index Scale:**
- `--z-dropdown` (1000), `--z-sticky` (1020), `--z-fixed` (1030), `--z-modal-backdrop` (1040), `--z-modal` (1050), `--z-popover` (1060), `--z-tooltip` (1070)

### Runtime Override Path

WordPress admins set overrides on the embed `<div>` (which is the shadow host):
```html
<div id="perimeter-sermons" data-theme="dark" style="--color-primary: #ff0000;">
```

CSS custom properties set on the shadow host element inherit into the shadow tree, overriding the `:host` defaults. Components using `bg-[var(--color-primary)]` syntax will pick up the override. Standard Tailwind utilities (`bg-primary`) use the static `@theme` value and will not respond to runtime overrides — this is intentional, as only brand/semantic colors need runtime customization.

---

## 2. Base CSS & Dark Mode Integration

### File: `packages/shared/src/styles/base.css`

**Dark mode custom variant** targeting `data-theme` on the inner wrapper div:

```css
@custom-variant dark (&:where([data-theme="dark"] *, [data-theme="dark"]));
```

This works in both shadow DOM (where `mountWidget` sets `data-theme` on `#widget-root`) and Storybook (where the decorator wraps stories in `<div data-theme="dark">`). Enables `dark:bg-stone-800`, `dark:text-stone-200`, etc. in all components.

**`:host` reset** updated to use token variables:

```css
:host {
    all: initial;
    display: block;
    font-family: var(--font-sans);
    color: var(--color-foreground);
    line-height: 1.5;
}
```

**Base layer additions:**
- `button, [role='button']` cursor rules (pointer default, not-allowed when disabled)
- Shimmer animation keyframe for Skeleton component
- Focus ring utility classes (`.focus-ring`, `.focus-ring-inset`) using `--color-ring`
- `.hide-scrollbar` utility

**Excluded from API:** Theme transition rules (300ms on all elements). Widgets set theme once at mount — smooth transitions aren't needed and would bloat CSS.

---

## 3. Component Library

### Directory: `packages/shared/src/`

```
components/
  primitives/
    Button.tsx
    Card.tsx              (CardHeader, CardBody, CardFooter)
    Input.tsx
    Badge.tsx
    Avatar.tsx
    Checkbox.tsx
    Label.tsx
    Select.tsx
    Textarea.tsx
    Switch.tsx
    Skeleton.tsx
    LoadingSpinner.tsx
    FilterChip.tsx
    EmptyState.tsx
    IndeterminateProgress.tsx
    index.ts
  motion/
    FadeIn.tsx
    SlideUp.tsx
    ScaleIn.tsx
    AnimatedList.tsx
    AnimatedPanel.tsx
    CountUp.tsx
    SkeletonTransition.tsx
    index.ts
  utils/
    cn.ts
    variants.ts
  index.ts
types/
  ui.ts
lib/
  motion/
    config.ts
```

### Shared Types (`types/ui.ts`)

Ported verbatim from the API's `src/lib/types/ui.ts`:

```typescript
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost'

interface BaseComponentProps {
    className?: string
    children?: ReactNode
    id?: string
    'data-testid'?: string
}

interface InteractiveProps extends BaseComponentProps {
    disabled?: boolean
    isLoading?: boolean
    'aria-label'?: string
}

interface VariantProps {
    variant?: Variant
    size?: Size
}

interface WidthProps {
    fullWidth?: boolean
}

// Utility types
type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>
type VariantValue<T> = T extends { variant: infer V } ? V : never
type SizeValue<T> = T extends { size: infer S } ? S : never
```

### Utilities

**`cn.ts`** — `clsx` + `tailwind-merge` for className merging with Tailwind conflict resolution. Direct port from API.

**`variants.ts`** — centralized mappings consumed by all components. Ported from API's `src/components/ui/utils/variants.ts`:
- `sizeClasses` — text size per Size
- `paddingSizes` — padding per Size
- `iconSizes` — icon pixel dimensions per Size
- `radiusSizes` — border radius per Size
- `variantClasses` — filled variant color classes (with `dark:` variants). Semantic colors use `bg-[var(--color-primary)]` syntax for runtime overrideability
- `outlineVariantClasses` — outline/bordered variant classes
- Helper functions: `getPaddingClasses()`, `getRadiusClasses()`, `getVariantClasses()`

### Component Design Patterns

All primitives follow these patterns (matching the API's conventions):
- `forwardRef` for ref forwarding
- `cn()` for className merging
- Consume centralized `variants.ts` for size/variant styling
- Include `dark:` Tailwind variants for dark mode
- Focus rings: `focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2`
- Accept `className` prop for consumer overrides

### Component Interfaces

All 15 primitives are ported from the API's `src/components/ui/primitives/` directory with matching props interfaces. Source files for reference during implementation:

| Component | API Source | Key Props |
|---|---|---|
| Button | `primitives/Button.tsx` | `variant`, `size`, `isLoading`, `outline`, `fullWidth` |
| Card | `primitives/Card.tsx` | `CardHeader`, `CardBody`, `CardFooter` subcomponents; `padding` |
| Input | `primitives/Input.tsx` | `size`, `error` (string), `leftIcon`, `rightIcon` |
| Badge | `primitives/Badge.tsx` | `variant`, `size`, `dot` (boolean), `outline` |
| Avatar | `primitives/Avatar.tsx` | `src`, `alt`, `size`, `fallback` |
| Checkbox | `primitives/Checkbox.tsx` | `checked`, `onChange`, `label`, `size` |
| Label | `primitives/Label.tsx` | `htmlFor`, `required`, `size` |
| Select | `primitives/Select.tsx` | `options`, `value`, `onChange`, `size`, `error` |
| Textarea | `primitives/Textarea.tsx` | `size`, `error`, `rows` |
| Switch | `primitives/Switch.tsx` | `checked`, `onChange`, `label`, `size` |
| Skeleton | `primitives/Skeleton.tsx` | `width`, `height`, `rounded`, `className` |
| LoadingSpinner | `primitives/LoadingSpinner.tsx` | `size`, `className` |
| FilterChip | `primitives/FilterChip.tsx` | `label`, `onRemove`, `variant`, `size` |
| EmptyState | `primitives/EmptyState.tsx` | `icon`, `title`, `description`, `action` |
| IndeterminateProgress | `primitives/IndeterminateProgress.tsx` | `className` |

### Existing Button Refactor

The current `Button.tsx` is refactored to:
- Use `cn()` instead of manual array joining
- Import from centralized `variants.ts` instead of inline maps
- Expand variant set: add `success`, `warning`, `error`, `info` variants
- Expand size set: add `xs` and `xl` sizes
- Add `dark:` variant classes

### New Dependencies

Added to `packages/shared/package.json` as regular dependencies:
- `clsx` — conditional className utility
- `tailwind-merge` — Tailwind class deduplication
- `framer-motion` — animation library

Note: `framer-motion` is a regular dependency (not peer). Since widgets are IIFE builds (not published npm packages), peer dependencies don't serve their usual purpose. Vite's tree-shaking ensures widgets that don't import motion components won't bundle Framer Motion.

---

## 4. Motion System

### Motion Config (`lib/motion/config.ts`)

Direct port from the API's `src/lib/motion/config.ts` — pure config objects with no DOM dependency:

**Springs:** `snappy` (stiffness 500, damping 30), `gentle` (200/20), `bouncy` (300/15)

**Durations:** `fast` (0.15s), `base` (0.2s), `slow` (0.3s), `entrance` (0.4s)

**Easings:** `easeOut` [0.16, 1, 0.3, 1], `easeInOut` [0.4, 0, 0.2, 1]

**Staggers:** `fast` (0.03s), `base` (0.05s), `slow` (0.08s)

**Transition presets:** `fast`, `base`, `slow`, `entrance` (tween); `snappy`, `gentle`, `bouncy` (spring)

**Variant presets:** All ported including `pageSlideVariants`, `modalBackdropVariants`, `modalPanelVariants` (retained for future composite component use): `fadeVariants`, `slideUpVariants`, `slideDownVariants`, `scaleInVariants`, `slideRightVariants`, `slideLeftVariants`, `pageSlideVariants`, `modalBackdropVariants`, `modalPanelVariants`, `staggerContainer()`, `staggerItemVariants`

### Motion Components (`components/motion/`)

| Component | Animation | API Source |
|---|---|---|
| `FadeIn` | Opacity entrance | `motion/FadeIn.tsx` |
| `SlideUp` | Vertical slide + fade | `motion/SlideUp.tsx` |
| `ScaleIn` | Scale + fade | `motion/ScaleIn.tsx` |
| `AnimatedList` | Staggered children | `motion/AnimatedList.tsx` |
| `AnimatedPanel` | Slide-right panel with optional backdrop | `motion/AnimatedPanel.tsx` |
| `CountUp` | Animated number counter | `motion/CountUp.tsx` |
| `SkeletonTransition` | Skeleton-to-content crossfade | `motion/SkeletonTransition.tsx` |

### Shadow DOM Compatibility

Framer Motion manipulates inline styles on DOM elements — this works inside shadow DOM with no adaptation. Bundle size consideration:

- `framer-motion` is ~32KB gzipped
- Widgets that import motion components bundle Framer Motion
- Widgets that don't use motion won't — Vite tree-shaking handles this
- Motion components are exported from a separate subpath (`@perimeter-widgets/shared/components/motion`) to avoid accidental inclusion

---

## 5. Storybook Integration

### Existing Setup

Storybook v10 at `packages/shared/.storybook/` with React-Vite framework and Tailwind plugin.

### Storybook / Shadow DOM Compatibility

Storybook renders outside shadow DOM, so `:host` selectors don't apply. To solve this, tokens are defined on both `:host` (for production widgets) and `.storybook-root` (for Storybook):

```css
:host,
.storybook-root {
    /* all tokens */
}
```

The Storybook decorator wraps each story in `<div class="storybook-root" data-theme="...">`, giving stories access to all tokens and dark mode switching without needing a real shadow root.

### Component Stories

Every primitive gets a stories file in `packages/shared/src/components/primitives/` with:
- All variants displayed
- All sizes (xs through xl)
- All states (default, hover, disabled, loading, error)
- Interactive controls via Storybook args

Every motion component gets a story with:
- Animation demonstration
- Replay button
- Configurable props (duration, delay, etc.)

### Design Token Documentation

Dedicated stories under `packages/shared/src/stories/` in a "Design System" Storybook category:

| Story | Content |
|---|---|
| **Colors** | All semantic + surface colors as swatches with hex values and CSS variable names, light and dark |
| **Typography** | Full font size/weight scale with sample text |
| **Spacing** | Visual representation of spacing scale |
| **Shadows** | Cards showing each shadow level |
| **Border Radius** | Visual examples of each radius token |

### Theme Switching

Add a Storybook toolbar decorator for dark mode:
- Toolbar item in `preview.ts` with light/dark options
- Decorator wraps each story in `<div class="storybook-root" data-theme="...">` container
- All component stories and token pages preview in both modes

### Preview Configuration Updates

- Import `base.css` (already done)
- Add theme toolbar globals item
- Add `.storybook-root` decorator with `data-theme` support
- Configure default viewport and backgrounds

---

## 6. `mountWidget()` Integration

### File: `packages/shared/src/shadow-dom/mount.tsx`

**`data-theme` handling:**

`mountWidget()` reads `data-theme` from the embed div and applies it to **both** the shadow host element and the `#widget-root` wrapper div inside the shadow root:

```typescript
const theme = element.getAttribute('data-theme');
const mountPoint = document.createElement('div');
mountPoint.id = 'widget-root';
if (theme) {
    // Host: so :host([data-theme="dark"]) swaps CSS custom property values
    shadowRoot.host.setAttribute('data-theme', theme);
    // Inner div: so @custom-variant dark selector activates dark: Tailwind utilities
    mountPoint.setAttribute('data-theme', theme);
}
shadowRoot.appendChild(mountPoint);
```

**Why both?** The `:host([data-theme="dark"])` selector in `tokens.css` swaps the runtime CSS custom property values (e.g., `--color-background` from white to dark). The `@custom-variant dark (&:where([data-theme="dark"] *, [data-theme="dark"]));` selector activates `dark:` Tailwind utility classes on elements inside the wrapper. Both are needed for complete dark mode support. The Storybook decorator achieves the same by setting `data-theme` on the `.storybook-root` wrapper div, which serves both purposes since there's no shadow host in that context.

**CSS custom property passthrough:** No code change needed. Properties set on the embed `<div>` via `style="--color-primary: #ff0000"` inherit into the shadow tree because the embed div IS the shadow host, and CSS custom properties inherit from host to shadow tree.

**No new providers.** Provider stack remains: QueryClient, Auth, Config. Theming is purely CSS-driven.

**Dynamic theme changes:** Treated as set-once at mount time, matching how all other `data-*` config works. A MutationObserver can be added later if dynamic switching is needed.

---

## Exports

Updated barrel export from `@perimeter-widgets/shared`:

```typescript
// Existing
export { mountWidget, ConfigProvider, useConfig } from './shadow-dom';
export { createApiClient, ApiError, createQueryClient } from './api';
export { getMPToken, AuthProvider, useAuth } from './auth';

// New: Components
export * from './components/primitives';
export * from './components/motion';

// New: Utilities
export { cn } from './components/utils/cn';
export * from './components/utils/variants';

// New: Types
export type * from './types/ui';

// New: Motion config
export * from './lib/motion/config';
```

Subpath exports added to `package.json`:
- `@perimeter-widgets/shared/styles` — CSS tokens + base (existing)
- `@perimeter-widgets/shared/styles/tokens` — tokens only (existing)
- `@perimeter-widgets/shared/components/motion` — motion components only (new)
- `@perimeter-widgets/shared/motion` — motion config only (new)

---

## What's Excluded

These API features are intentionally excluded:

- **Composite components** (Modal, Dropdown, Drawer, DatePicker, etc.) — require Headless UI dependency, not needed for current widgets
- **Theme transition CSS** — widgets set theme once at mount, smooth transitions unnecessary
- **`next-themes` provider** — Next.js-specific, replaced by `data-theme` attribute
- **Email content styling** — API-specific
- **Glass effect utility** — API-specific
- **`@tailwindcss/typography` plugin** — not needed for widget content
- **Primary color 50-950 scale** (from API's `globals.css` `@theme`) — widgets use semantic tokens only

---

## Dependencies Added

| Package | Purpose | Type |
|---|---|---|
| `clsx` | Conditional className utility | dependency |
| `tailwind-merge` | Tailwind class deduplication | dependency |
| `framer-motion` | Animation library | dependency |

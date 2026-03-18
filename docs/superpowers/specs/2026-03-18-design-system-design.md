# Design System for Perimeter Widgets

> **Date:** 2026-03-18
> **Status:** Approved
> **Scope:** Design tokens, primitive components, motion system, Storybook documentation, dark mode, runtime customization

---

## Overview

Establish a comprehensive design system for the widgets monorepo that mirrors the perimeter-api's component library, adapted for shadow DOM isolation. The system provides a standardized theme using Perimeter Church brand colors, 15 primitive components, a Framer Motion animation system, dark mode via `data-theme` attribute, runtime token overrides via CSS custom properties, and full Storybook documentation.

---

## Approach

**CSS Custom Properties + Shadow DOM `:host` Inheritance.**

All design tokens are defined as CSS custom properties on `:host`. Tailwind v4's `@theme` directive references these variables so utility classes automatically respond to runtime overrides. Dark mode is handled via `:host([data-theme="dark"])` selectors. No React context or JS runtime is needed for theming — it's purely CSS-driven.

**Why this approach:**
- CSS custom properties inherit through the shadow boundary when set on the host element
- Zero JS overhead for theming — no providers, no re-renders
- WordPress admins can override any token via inline `style` on the embed `<div>`
- Tailwind classes just work with no additional configuration

---

## 1. Token Architecture

### File: `packages/shared/src/styles/tokens.css`

Expand from the current minimal token set to match the API's full token system, scoped to shadow DOM via `:host` instead of `:root`.

### Token Categories

**Semantic Colors** (with hover/active/foreground variants):
- Primary: warm indigo (`#5b5bd6`)
- Success: warm green (`#46a758`)
- Warning: warm amber (`#f5a623`)
- Error: warm rose (`#e54666`)

**Surface Colors:**
- `--color-background`, `--color-foreground`
- `--color-card`, `--color-card-foreground`
- `--color-muted`, `--color-muted-foreground`
- `--color-accent`, `--color-accent-foreground`
- `--color-popover`, `--color-popover-foreground`
- `--color-destructive`, `--color-destructive-foreground`
- `--color-border`, `--color-input`, `--color-ring`

**Spacing Scale:**
- `--spacing-xs` (8px) through `--spacing-3xl` (64px)

**Typography:**
- Font families: `--font-sans`, `--font-mono`
- Font sizes: `--font-size-xs` (12px) through `--font-size-4xl` (36px)
- Font weights: normal (400), medium (500), semibold (600), bold (700)
- Line heights: tight (1.25), normal (1.5), relaxed (1.75)

**Border Radius:**
- `--radius-none` (0) through `--radius-full` (9999px)

**Shadows** (warm stone-tinted):
- `--shadow-xs` through `--shadow-2xl`
- Dark mode overrides with stronger opacity

**Transitions:**
- `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-slow` (300ms)
- All use `cubic-bezier(0.4, 0, 0.2, 1)`

**Z-Index Scale:**
- `--z-dropdown` (1000) through `--z-tooltip` (1070)

### Dark Mode

Light mode tokens on `:host`, dark mode overrides on `:host([data-theme="dark"])`:

```css
:host {
    --color-background: #ffffff;
    --color-foreground: #1c1917;
    /* ... all light mode tokens */
}

:host([data-theme="dark"]) {
    --color-background: #0c0a09;
    --color-foreground: #fafaf9;
    /* ... all dark mode overrides */
}
```

### `@theme` Block

The `@theme` block references CSS variables (not hardcoded hex) so Tailwind classes respond to runtime overrides:

```css
@theme {
    --color-primary: var(--color-primary);
    /* etc. */
}
```

### Runtime Override Path

WordPress admins set overrides on the embed `<div>`:
```html
<div id="perimeter-sermons" data-theme="dark" style="--color-primary: #ff0000;">
```

CSS custom properties inherit through the shadow boundary, overriding `:host` defaults.

---

## 2. Base CSS & Dark Mode Integration

### File: `packages/shared/src/styles/base.css`

**Dark mode custom variant** for Tailwind v4, targeting `data-theme` on the shadow host:

```css
@custom-variant dark (&:where(:host([data-theme="dark"]) *, :host([data-theme="dark"])));
```

This enables `dark:bg-stone-800`, `dark:text-stone-200`, etc. in all components.

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
- Focus ring utility classes (`.focus-ring`, `.focus-ring-inset`)
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

Ported from the API:

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
```

### Utilities

**`cn.ts`** — `clsx` + `tailwind-merge` for className merging with Tailwind conflict resolution.

**`variants.ts`** — centralized mappings consumed by all components:
- `sizeClasses` — text size per Size
- `paddingSizes` — padding per Size
- `iconSizes` — icon pixel dimensions per Size
- `radiusSizes` — border radius per Size
- `variantClasses` — filled variant color classes (with `dark:` variants)
- `outlineVariantClasses` — outline/bordered variant classes
- Helper functions: `getPaddingClasses()`, `getRadiusClasses()`, `getVariantClasses()`

### Component Design Patterns

All primitives follow these patterns:
- `forwardRef` for ref forwarding
- `cn()` for className merging
- Consume centralized `variants.ts` for size/variant styling
- Include `dark:` Tailwind variants for dark mode
- Focus rings: `focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2`
- Accept `className` prop for consumer overrides

### Existing Button Refactor

The current `Button.tsx` is refactored to:
- Use `cn()` instead of manual array joining
- Import from centralized `variants.ts` instead of inline maps
- Expand variant set: add `success`, `warning`, `error`, `info` variants
- Expand size set: add `xs` and `xl` sizes
- Add `dark:` variant classes

### New Dependencies

Added to `packages/shared/package.json`:
- `clsx` — conditional className utility
- `tailwind-merge` — Tailwind class deduplication
- `framer-motion` — animation library (peer dependency for tree-shaking)

---

## 4. Motion System

### Motion Config (`lib/motion/config.ts`)

Direct port from the API — pure config objects with no DOM dependency:

**Springs:** `snappy` (stiffness 500, damping 30), `gentle` (200/20), `bouncy` (300/15)

**Durations:** `fast` (0.15s), `base` (0.2s), `slow` (0.3s), `entrance` (0.4s)

**Easings:** `easeOut` [0.16, 1, 0.3, 1], `easeInOut` [0.4, 0, 0.2, 1]

**Staggers:** `fast` (0.03s), `base` (0.05s), `slow` (0.08s)

**Transition presets:** `fast`, `base`, `slow`, `entrance` (tween); `snappy`, `gentle`, `bouncy` (spring)

**Variant presets:** `fadeVariants`, `slideUpVariants`, `slideDownVariants`, `scaleInVariants`, `slideRightVariants`, `slideLeftVariants`, `pageSlideVariants`, `modalBackdropVariants`, `modalPanelVariants`, `staggerContainer()`, `staggerItemVariants`

### Motion Components (`components/motion/`)

| Component | Animation |
|---|---|
| `FadeIn` | Opacity entrance |
| `SlideUp` | Vertical slide + fade |
| `ScaleIn` | Scale + fade |
| `AnimatedList` | Staggered children |
| `AnimatedPanel` | Slide-right panel with optional backdrop |
| `CountUp` | Animated number counter |
| `SkeletonTransition` | Skeleton-to-content crossfade |

### Shadow DOM Compatibility

Framer Motion manipulates inline styles on DOM elements — this works inside shadow DOM with no adaptation. The only consideration is bundle size:

- `framer-motion` is ~32KB gzipped
- Widgets that import motion components bundle Framer Motion
- Widgets that don't use motion won't — tree-shaking handles this
- Motion components are exported from a separate subpath (`@perimeter-widgets/shared/components/motion`) to avoid accidental inclusion

---

## 5. Storybook Integration

### Existing Setup

Storybook v10 at `packages/shared/.storybook/` with React-Vite framework and Tailwind plugin.

### Component Stories

Every primitive gets a stories file with:
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
- Decorator wraps each story in a container with `data-theme` attribute
- All component stories and token pages preview in both modes

### Preview Configuration Updates

- Import `base.css` (already done)
- Add theme toolbar globals item
- Add decorator for `data-theme` container wrapping
- Configure default viewport and backgrounds

---

## 6. `mountWidget()` Integration

### File: `packages/shared/src/shadow-dom/mount.tsx`

**`data-theme` handling:**

```typescript
const theme = element.getAttribute('data-theme');
if (theme) {
    shadowRoot.host.setAttribute('data-theme', theme);
}
```

The CSS in `:host([data-theme="dark"])` handles the visual switching. No React context needed.

**CSS custom property passthrough:** No code change. Properties set on the embed `<div>` via `style="--color-primary: #ff0000"` naturally inherit into the shadow root.

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

Subpath exports in `package.json` for tree-shaking:
- `@perimeter-widgets/shared/styles` — CSS tokens + base
- `@perimeter-widgets/shared/components/motion` — motion components only
- `@perimeter-widgets/shared/motion` — motion config only

---

## What's Excluded

These API features are intentionally excluded:

- **Composite components** (Modal, Dropdown, Drawer, etc.) — require Headless UI dependency, not needed for current widgets
- **Theme transition CSS** — widgets set theme once at mount, smooth transitions unnecessary
- **`next-themes` provider** — Next.js-specific, replaced by `data-theme` attribute
- **Email content styling** — API-specific
- **Glass effect utility** — API-specific
- **`@tailwindcss/typography` plugin** — not needed for widget content

---

## Dependencies Added

| Package | Purpose | Type |
|---|---|---|
| `clsx` | Conditional className utility | dependency |
| `tailwind-merge` | Tailwind class deduplication | dependency |
| `framer-motion` | Animation library | peerDependency |

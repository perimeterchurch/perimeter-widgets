# Design Tokens

> **Scope:** Colors, typography, spacing, shadows, border radius, z-index, transitions — shared across all widgets
> **Key files:** `packages/shared/src/styles/tokens.css`, `packages/shared/src/styles/base.css`
> **Last verified:** 2026-03-18

---

## Overview

Design tokens are defined in `packages/shared/src/styles/tokens.css` using a two-layer architecture. All widgets import these tokens via `@import '@perimeter-widgets/shared/styles'` in their CSS.

Tokens match the perimeter-api design system where applicable (same semantic colors, font stack, neutral scale).

---

## Two-Layer Architecture

### Layer 1: `@theme` Block (Build Time)

Static hex values inside the Tailwind v4 `@theme` directive. These values are resolved at build time by Tailwind and generate utility classes (e.g., `bg-primary`, `text-error`, `shadow-lg`).

### Layer 2: `:host` / `.storybook-root` (Runtime)

CSS custom properties scoped to the shadow DOM host (`:host`) and Storybook wrapper (`.storybook-root`). These mirror Layer 1 values but are overridable at runtime — enabling dark mode, WordPress admin customization, and per-widget theming.

### Layer 3: Dark Mode Overrides

Scoped to `:host([data-theme='dark'])` and `.storybook-root[data-theme='dark']`. Overrides surface colors, base scale, and shadows for dark mode.

### Layer 4: Focus Ring Utilities

Tailwind `@layer utilities` providing `.focus-ring` and `.focus-ring-inset` classes using the `--color-ring` token.

---

## Dark Mode

Dark mode is activated by setting `data-theme="dark"` on the widget's shadow host element or the Storybook wrapper div. There is no `prefers-color-scheme` media query — theme is always explicit.

```html
<!-- Widget: set via data attribute -->
<div id="widget-sermons" data-theme="dark"></div>

<!-- Storybook: toggled via toolbar decorator -->
<div class="storybook-root" data-theme="dark">...</div>
```

Dark mode overrides surface colors, base scale colors, and shadow intensities. Semantic colors (primary, success, warning, error) remain unchanged.

---

## Colors

### Semantic Colors

| Token | Light Hex | Tailwind Class | Purpose |
| --- | --- | --- | --- |
| `--color-primary` | `#5b5bd6` | `bg-primary`, `text-primary` | Warm indigo — primary actions |
| `--color-primary-hover` | `#4e4eca` | `hover:bg-primary-hover` | Primary hover state |
| `--color-primary-active` | `#4242b8` | `active:bg-primary-active` | Primary active/pressed state |
| `--color-primary-foreground` | `#ffffff` | `text-primary-foreground` | Text on primary backgrounds |
| `--color-success` | `#46a758` | `bg-success`, `text-success` | Warm green — success states |
| `--color-success-hover` | `#3d9b4f` | `hover:bg-success-hover` | Success hover |
| `--color-success-active` | `#348746` | `active:bg-success-active` | Success active |
| `--color-success-foreground` | `#ffffff` | `text-success-foreground` | Text on success backgrounds |
| `--color-warning` | `#f5a623` | `bg-warning`, `text-warning` | Warm amber — warning states |
| `--color-warning-hover` | `#e09918` | `hover:bg-warning-hover` | Warning hover |
| `--color-warning-active` | `#c88a14` | `active:bg-warning-active` | Warning active |
| `--color-warning-foreground` | `#ffffff` | `text-warning-foreground` | Text on warning backgrounds |
| `--color-error` | `#e54666` | `bg-error`, `text-error` | Warm rose — error states |
| `--color-error-hover` | `#d93d5c` | `hover:bg-error-hover` | Error hover |
| `--color-error-active` | `#c63652` | `active:bg-error-active` | Error active |
| `--color-error-foreground` | `#ffffff` | `text-error-foreground` | Text on error backgrounds |

### Surface Colors

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--color-background` | `#ffffff` | `#0c0a09` | Page background |
| `--color-foreground` | `#1c1917` | `#fafaf9` | Page text |
| `--color-card` | `#ffffff` | `#1c1917` | Card background |
| `--color-card-foreground` | `#1c1917` | `#fafaf9` | Card text |
| `--color-muted` | `#f5f5f4` | `#292524` | Muted background |
| `--color-muted-foreground` | `#78716c` | `#a8a29e` | Muted text |
| `--color-accent` | `#f5f5f4` | `#292524` | Accent background |
| `--color-accent-foreground` | `#1c1917` | `#fafaf9` | Accent text |
| `--color-popover` | `#ffffff` | `#1c1917` | Popover background |
| `--color-popover-foreground` | `#1c1917` | `#fafaf9` | Popover text |
| `--color-destructive` | `#e54666` | `#e54666` | Destructive action |
| `--color-destructive-foreground` | `#ffffff` | `#ffffff` | Text on destructive |
| `--color-border` | `#d6d3d1` | `#44403c` | Default border |
| `--color-input` | `#d6d3d1` | `#44403c` | Input border |
| `--color-ring` | `#5b5bd6` | `#5b5bd6` | Focus ring |

### Base Scale (Stone)

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-bg` | `#fafaf9` | `#0c0a09` | Page background |
| `--color-bg-subtle` | `#f5f5f4` | `#1c1917` | Subtle background |
| `--color-bg-muted` | `#e7e5e4` | `#292524` | Muted background |
| `--color-text` | `#1c1917` | `#fafaf9` | Primary text |
| `--color-text-secondary` | `#57534e` | `#a8a29e` | Secondary text |
| `--color-text-muted` | `#a8a29e` | `#78716c` | Muted text |
| `--color-border-subtle` | `#e7e5e4` | `#292524` | Subtle border |

---

## Typography

### Font Families

| Token | Value | Tailwind Class |
| --- | --- | --- |
| `--font-sans` | `ui-sans-serif, system-ui, sans-serif, ...` | `font-sans` |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, ...` | `font-mono` |

`font-sans` is the default for all widgets via the `:host` reset in `base.css`.

### Font Sizes

| Token | Value | Tailwind Class |
| --- | --- | --- |
| `--font-size-xs` | `0.75rem` (12px) | `text-xs` |
| `--font-size-sm` | `0.875rem` (14px) | `text-sm` |
| `--font-size-base` | `1rem` (16px) | `text-base` |
| `--font-size-lg` | `1.125rem` (18px) | `text-lg` |
| `--font-size-xl` | `1.25rem` (20px) | `text-xl` |
| `--font-size-2xl` | `1.5rem` (24px) | `text-2xl` |
| `--font-size-3xl` | `1.875rem` (30px) | `text-3xl` |
| `--font-size-4xl` | `2.25rem` (36px) | `text-4xl` |

### Font Weights

| Token | Value |
| --- | --- |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### Line Heights

| Token | Value |
| --- | --- |
| `--line-height-tight` | `1.25` |
| `--line-height-normal` | `1.5` |
| `--line-height-relaxed` | `1.75` |

---

## Spacing

| Token | Value |
| --- | --- |
| `--spacing-xs` | `0.5rem` (8px) |
| `--spacing-sm` | `0.75rem` (12px) |
| `--spacing-md` | `1rem` (16px) |
| `--spacing-lg` | `1.5rem` (24px) |
| `--spacing-xl` | `2rem` (32px) |
| `--spacing-2xl` | `3rem` (48px) |
| `--spacing-3xl` | `4rem` (64px) |

Spacing tokens are runtime-only (Layer 2). Use via `var(--spacing-md)` in component styles.

---

## Shadows

All shadows use a warm stone tint (`rgb(28 25 23 / ...)`) in light mode and pure black (`rgb(0 0 0 / ...)`) with higher opacity in dark mode.

| Token | Tailwind Class | Use Case |
| --- | --- | --- |
| `--shadow-xs` | `shadow-xs` | Subtle elevation (buttons, inputs) |
| `--shadow-sm` | `shadow-sm` | Cards, list items |
| `--shadow-md` | `shadow-md` | Dropdowns, popovers |
| `--shadow-lg` | `shadow-lg` | Modals, dialogs |
| `--shadow-xl` | `shadow-xl` | Large floating elements |
| `--shadow-2xl` | `shadow-2xl` | Hero sections, overlays |

---

## Border Radius

| Token | Value | Tailwind Class |
| --- | --- | --- |
| `--radius-none` | `0` | `rounded-none` |
| `--radius-sm` | `0.375rem` (6px) | `rounded-sm` |
| `--radius-md` | `0.5rem` (8px) | `rounded-md` |
| `--radius-lg` | `0.75rem` (12px) | `rounded-lg` |
| `--radius-xl` | `1rem` (16px) | `rounded-xl` |
| `--radius-2xl` | `1.5rem` (24px) | `rounded-2xl` |
| `--radius-full` | `9999px` | `rounded-full` |

---

## Transitions

| Token | Value | Use Case |
| --- | --- | --- |
| `--transition-fast` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | Hover states, color changes |
| `--transition-base` | `200ms cubic-bezier(0.4, 0, 0.2, 1)` | Default interactions |
| `--transition-slow` | `300ms cubic-bezier(0.4, 0, 0.2, 1)` | Layout shifts, panels |

---

## Z-Index Scale

| Token | Value | Use Case |
| --- | --- | --- |
| `--z-dropdown` | `1000` | Dropdown menus |
| `--z-sticky` | `1020` | Sticky headers |
| `--z-fixed` | `1030` | Fixed position elements |
| `--z-modal-backdrop` | `1040` | Modal backdrop overlay |
| `--z-modal` | `1050` | Modal dialogs |
| `--z-popover` | `1060` | Popovers, tooltips |
| `--z-tooltip` | `1070` | Tooltip highest layer |

---

## Shadow DOM Reset

The `base.css` file includes a `:host` reset that applies to every widget:

```css
:host {
    all: initial;
    display: block;
    font-family: var(--font-sans);
    color: var(--color-foreground);
    line-height: 1.5;
}

.storybook-root {
    font-family: var(--font-sans);
    color: var(--color-foreground);
    line-height: 1.5;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}
```

The `:host` selector resets all inherited styles from WordPress themes. The `.storybook-root` selector provides the equivalent baseline in Storybook (which has no shadow DOM). Both selectors read from the same CSS custom properties.

---

## Runtime Override Path (WordPress Admins)

WordPress admins can override tokens at runtime by injecting CSS custom properties on the widget's shadow host element:

```html
<div id="widget-sermons"
     style="--color-primary: #2563eb; --color-primary-hover: #1d4ed8;">
</div>
```

Because Layer 2 properties are defined on `:host`, any `style` attribute on the host element takes precedence. This allows per-widget color customization without rebuilding.

---

## Related Docs

- [Shared Package](../architecture/shared-package.md) — Where tokens are defined
- [Architecture Overview](../architecture/overview.md) — Shadow DOM context

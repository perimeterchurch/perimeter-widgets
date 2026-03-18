# Design Tokens

> **Scope:** Colors, typography, spacing, border radius — shared across all widgets
> **Key files:** `packages/shared/src/styles/tokens.css`
> **Last verified:** 2026-03-18

---

## Overview

Design tokens are defined in `packages/shared/src/styles/tokens.css` using Tailwind v4's `@theme` directive. All widgets import these tokens via `@import '@perimeter-widgets/shared/styles'` in their CSS.

Tokens match the perimeter-api design system where applicable (same semantic colors, font stack, neutral scale).

---

## Colors

### Semantic Colors

| Token                        | Hex       | Tailwind Class               | Purpose                       |
| ---------------------------- | --------- | ---------------------------- | ----------------------------- |
| `--color-primary`            | `#5b5bd6` | `bg-primary`, `text-primary` | Warm indigo — primary actions |
| `--color-primary-hover`      | `#4e4ec2` | `hover:bg-primary-hover`     | Primary hover state           |
| `--color-primary-active`     | `#4343b0` | `active:bg-primary-active`   | Primary active/pressed state  |
| `--color-primary-foreground` | `#ffffff` | `text-primary-foreground`    | Text on primary backgrounds   |
| `--color-success`            | `#46a758` | `bg-success`, `text-success` | Warm green — success states   |
| `--color-success-hover`      | `#3d9a4e` | `hover:bg-success-hover`     | Success hover                 |
| `--color-success-foreground` | `#ffffff` | `text-success-foreground`    | Text on success backgrounds   |
| `--color-warning`            | `#f5a623` | `bg-warning`, `text-warning` | Warm amber — warning states   |
| `--color-warning-hover`      | `#e09915` | `hover:bg-warning-hover`     | Warning hover                 |
| `--color-warning-foreground` | `#ffffff` | `text-warning-foreground`    | Text on warning backgrounds   |
| `--color-error`              | `#e54666` | `bg-error`, `text-error`     | Warm rose — error states      |
| `--color-error-hover`        | `#d63a59` | `hover:bg-error-hover`       | Error hover                   |
| `--color-error-foreground`   | `#ffffff` | `text-error-foreground`      | Text on error backgrounds     |

### Neutral Scale

Use Tailwind's `stone-*` scale for all neutral colors. Never use `gray-*` or `zinc-*`.

| Usage             | Class                |
| ----------------- | -------------------- |
| Page background   | `bg-stone-50`        |
| Card background   | `bg-white`           |
| Primary text      | `text-stone-900`     |
| Secondary text    | `text-stone-600`     |
| Muted text        | `text-stone-400`     |
| Borders           | `border-stone-200`   |
| Hover backgrounds | `hover:bg-stone-100` |

---

## Typography

### Font Family

```css
--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

Use `font-sans` class — it's the default for all widgets via the `:host` reset in `base.css`.

---

## Border Radius

| Token         | Value  | Tailwind Class |
| ------------- | ------ | -------------- |
| `--radius-sm` | `6px`  | `rounded-sm`   |
| `--radius-md` | `8px`  | `rounded-md`   |
| `--radius-lg` | `12px` | `rounded-lg`   |
| `--radius-xl` | `16px` | `rounded-xl`   |

---

## Shadow DOM Reset

The `base.css` file includes a `:host` reset that applies to every widget:

```css
:host {
    all: initial; /* Reset all inherited styles */
    display: block;
    font-family: var(--font-sans);
    color: #1c1917; /* stone-900 */
    line-height: 1.5;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}
```

This ensures widgets have a clean baseline regardless of the WordPress theme's styles.

---

## Related Docs

- [Shared Package](../architecture/shared-package.md) — Where tokens are defined
- [Architecture Overview](../architecture/overview.md) — Shadow DOM context

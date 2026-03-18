# Design System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a comprehensive design system for the widgets monorepo — tokens, 15 primitives, motion system, Storybook docs, dark mode, and runtime customization.

**Architecture:** Two-layer token system (CSS custom properties on `:host` for runtime overrides + static `@theme` for Tailwind utility generation). Dark mode via `data-theme` attribute on both shadow host and inner wrapper. All components ported from perimeter-api with shadow DOM adaptations.

**Tech Stack:** Tailwind CSS v4, CSS custom properties, React 19, Framer Motion, Storybook v10, clsx + tailwind-merge

**Spec:** `docs/superpowers/specs/2026-03-18-design-system-design.md`

**API reference base path:** `../../perimeter-api/src/` (relative to widget repo root)

---

## Chunk 1: Foundation (Tokens, Base CSS, Types, Utilities, Dependencies)

### Task 0: Create feature branch

- [ ] **Step 1: Create branch**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
git checkout -b feat/design-system
```

---

### Task 1: Install dependencies

**Files:**
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Install clsx, tailwind-merge, and framer-motion**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm add --filter @perimeter-widgets/shared clsx tailwind-merge framer-motion
```

- [ ] **Step 2: Verify installation**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared
cat package.json | grep -E "clsx|tailwind-merge|framer-motion"
```

Expected: All three appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/package.json pnpm-lock.yaml
git commit -m "chore: add clsx, tailwind-merge, framer-motion to shared package"
```

---

### Task 2: Expand design tokens

**Files:**
- Modify: `packages/shared/src/styles/tokens.css`

**Reference:** `../../perimeter-api/src/styles/tokens.css` — port all token values from the API's `:root` and `.dark` blocks, adapting to `:host` / `:host([data-theme="dark"])` selectors.

- [ ] **Step 1: Replace `tokens.css` with full two-layer token system**

Replace the entire contents of `packages/shared/src/styles/tokens.css` with:

1. **`@theme` block** — static hex values for Tailwind utility class generation. Include ALL token categories: semantic colors (primary/success/warning/error with hover/active/foreground), surface colors (background, foreground, card, muted, accent, popover, destructive, border, input, ring), base scale (bg, bg-subtle, bg-muted, text, text-secondary, text-muted, border-subtle), font families (sans, mono), font sizes (xs through 4xl), border radius (none through full), shadows (xs through 2xl), transitions. Values match the API's canonical hex values.

2. **`:host, .storybook-root` block** — runtime CSS custom properties. Same tokens as `@theme` but as plain CSS custom properties that can be overridden at runtime. Include spacing scale, font weights, line heights, z-index scale (these don't need `@theme` entries since they're used via `var()` directly).

3. **`:host([data-theme="dark"]), .storybook-root[data-theme="dark"])` block** — dark mode overrides for surface colors, base scale, and shadows. Semantic colors (primary/success/warning/error) stay the same in dark mode. Port values from the API's `.dark` block.

4. **Focus ring utilities** in `@layer utilities` — `.focus-ring` and `.focus-ring-inset` classes.

Use the API's `tokens.css` as the canonical source for all hex values. Where current widget tokens differ, the API values win.

- [ ] **Step 2: Verify Tailwind picks up the tokens**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm build --filter @perimeter-widgets/storyboard 2>&1 | head -20
```

Expected: Build succeeds without CSS errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/styles/tokens.css
git commit -m "feat: expand design tokens to full API parity with dark mode"
```

---

### Task 3: Update base CSS with dark mode variant

**Files:**
- Modify: `packages/shared/src/styles/base.css`

**Reference:** `../../perimeter-api/src/styles/globals.css` — port base layer overrides (button cursor, shimmer keyframe), excluding theme transitions and email-specific styles.

- [ ] **Step 1: Update `base.css`**

Replace the entire contents with:

```css
@import 'tailwindcss';
@import './tokens.css';

/* Dark mode via data-theme attribute on wrapper div */
@custom-variant dark (&:where([data-theme="dark"] *, [data-theme="dark"]));

/* Shadow DOM host reset */
:host {
    all: initial;
    display: block;
    font-family: var(--font-sans);
    color: var(--color-foreground);
    line-height: 1.5;
}

/* Storybook host equivalent */
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

@layer base {
    button,
    [role='button'] {
        cursor: pointer;
    }

    button:disabled,
    [role='button'][aria-disabled='true'] {
        cursor: not-allowed;
    }
}

/* Skeleton shimmer animation */
@keyframes shimmer {
    0% {
        background-position: -1000px 0;
    }
    100% {
        background-position: 1000px 0;
    }
}

.animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(
        to right,
        rgb(245 245 244) 4%,
        rgb(231 229 228) 25%,
        rgb(245 245 244) 36%
    );
    background-size: 1000px 100%;
}

[data-theme='dark'] .animate-shimmer {
    background: linear-gradient(
        to right,
        rgb(28 25 23) 4%,
        rgb(41 37 36) 25%,
        rgb(28 25 23) 36%
    );
}

/* Hide scrollbar utility */
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm build --filter @perimeter-widgets/storyboard 2>&1 | head -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/styles/base.css
git commit -m "feat: add dark mode variant and base layer overrides"
```

---

### Task 4: Add shared UI types

**Files:**
- Create: `packages/shared/src/types/ui.ts`

**Reference:** `../../perimeter-api/src/lib/types/ui.ts` — port verbatim.

- [ ] **Step 1: Create the types file**

Create `packages/shared/src/types/ui.ts` with the full type definitions from the API:

```typescript
/**
 * Shared UI Types
 * Type definitions for UI components
 */

import { type ReactNode } from 'react';

/** Component size variants */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Component visual variants */
export type Variant =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'ghost';

/** Base props for all components */
export interface BaseComponentProps {
    className?: string;
    children?: ReactNode;
    id?: string;
    'data-testid'?: string;
}

/** Props for interactive components (buttons, inputs, etc.) */
export interface InteractiveProps extends BaseComponentProps {
    disabled?: boolean;
    isLoading?: boolean;
    'aria-label'?: string;
}

/** Props for components with variants */
export interface VariantProps {
    variant?: Variant;
    size?: Size;
}

/** Props for components that support full width */
export interface WidthProps {
    fullWidth?: boolean;
}

/** Utility type: Make specific props required */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Utility type: Extract variant value from a type */
export type VariantValue<T> = T extends { variant: infer V } ? V : never;

/** Utility type: Extract size value from a type */
export type SizeValue<T> = T extends { size: infer S } ? S : never;
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/ui.ts
git commit -m "feat: add shared UI type definitions"
```

---

### Task 5: Add `cn()` utility

**Files:**
- Create: `packages/shared/src/components/utils/cn.ts`

**Reference:** `../../perimeter-api/src/components/ui/utils/cn.ts` — port verbatim.

- [ ] **Step 1: Create the utility file**

Create `packages/shared/src/components/utils/cn.ts`:

```typescript
/**
 * className utility
 * Merges Tailwind CSS classes with proper precedence handling
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple className values and resolves Tailwind conflicts
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // => 'text-blue-500' (if condition is true)
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/components/utils/cn.ts
git commit -m "feat: add cn() className merging utility"
```

---

### Task 6: Add centralized variants

**Files:**
- Create: `packages/shared/src/components/utils/variants.ts`

**Reference:** `../../perimeter-api/src/components/ui/utils/variants.ts` — port with adaptation. Semantic color tokens in `variantClasses` and `outlineVariantClasses` use `bg-[var(--color-primary)]` arbitrary value syntax for runtime overrideability.

- [ ] **Step 1: Create the variants file**

Create `packages/shared/src/components/utils/variants.ts`. Port the API's variants with these adaptations:
- Import `Size` and `Variant` types from `../../types/ui` (relative path from utils dir)
- Semantic color variant classes use arbitrary value syntax: e.g., `bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]`
- Secondary and ghost variants use stone Tailwind utilities (static, not overridable) with `dark:` variants
- Include all helper functions: `getPaddingClasses()`, `getRadiusClasses()`, `getVariantClasses()`

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/components/utils/variants.ts
git commit -m "feat: add centralized variant mappings"
```

---

### Task 7: Update `mountWidget()` for dark mode

**Files:**
- Modify: `packages/shared/src/shadow-dom/mount.tsx`

- [ ] **Step 1: Add `data-theme` propagation**

Insert between `mountPoint.id = 'widget-root';` and `shadowRoot.appendChild(mountPoint);` in `mount.tsx`:

```typescript
// Propagate data-theme for dark mode support
const theme = element.getAttribute('data-theme');
if (theme) {
    // Host: so :host([data-theme="dark"]) swaps CSS custom property values
    shadowRoot.host.setAttribute('data-theme', theme);
    // Inner div: so @custom-variant dark selector activates dark: Tailwind utilities
    mountPoint.setAttribute('data-theme', theme);
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/shadow-dom/mount.tsx
git commit -m "feat: propagate data-theme attribute for dark mode support"
```

---

### Task 8: Update barrel exports and package.json

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/components/index.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Update `components/index.ts` barrel export**

Replace contents of `packages/shared/src/components/index.ts`:

```typescript
// Primitives
export * from './primitives';

// Utilities
export { cn } from './utils/cn';
export * from './utils/variants';
```

Note: Motion components are NOT re-exported here — they use a separate subpath to avoid bundling framer-motion into widgets that don't use it.

- [ ] **Step 2: Create primitives barrel export**

Create `packages/shared/src/components/primitives/index.ts`:

```typescript
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

This will be expanded as each primitive is added. For now, only Button exists.

- [ ] **Step 3: Move Button to primitives directory**

Move `packages/shared/src/components/Button.tsx` to `packages/shared/src/components/primitives/Button.tsx`. If `packages/shared/src/components/Button.stories.tsx` exists, move it to `packages/shared/src/components/primitives/Button.stories.tsx` and update its import path. (The stories file will be fully rewritten in Chunk 2, Task 9.)

After moving, verify downstream consumers still resolve correctly:
```bash
pnpm typecheck --filter @perimeter-widgets/shared
pnpm build --filter @perimeter-widgets/widget-sermons 2>&1 | tail -5
```

- [ ] **Step 4: Update main `index.ts` barrel export**

Replace contents of `packages/shared/src/index.ts`:

```typescript
// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, MountResult } from './shadow-dom/mount';

// API Client
export { createApiClient, ApiError } from './api/client';
export type { ApiClient, ApiClientOptions } from './api/client';

// Auth
export { getMPToken, AuthProvider, useAuth } from './auth/mp-token';
export type { MPAuthState } from './auth/mp-token';

// Config
export { ConfigProvider, useConfig } from './shadow-dom/config';
export type { WidgetConfig } from './shadow-dom/config';

// React Query
export { createQueryClient } from './api/query-client';

// Components
export * from './components';

// Types
export type * from './types/ui';
```

- [ ] **Step 5: Add subpath exports to `package.json`**

No subpath export changes needed yet — the motion subpath exports (`./components/motion` and `./motion`) are deferred to Chunk 4 Task 28 when those files are created.

- [ ] **Step 6: Verify build and types**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared && pnpm build --filter @perimeter-widgets/storyboard 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/src/components/ packages/shared/package.json
git commit -m "refactor: restructure component exports and add subpath entries"
```

---

## Chunk 2: Primitive Components (Part 1 — Button refactor + Card, Input, Badge, Label, Skeleton, LoadingSpinner)

### Task 9: Refactor Button to use design system

**Files:**
- Modify: `packages/shared/src/components/primitives/Button.tsx`
- Create: `packages/shared/src/components/primitives/Button.stories.tsx` (rewrite from scratch)

**Reference:** `../../perimeter-api/src/components/ui/primitives/Button.tsx`

- [ ] **Step 1: Refactor Button component**

Rewrite `Button.tsx` to:
- Import `cn` from `../utils/cn`
- Import `Size`, `Variant` from `../../types/ui`
- Import `variantClasses`, `outlineVariantClasses`, `paddingSizes`, `sizeClasses` from `../utils/variants`
- Use `cn()` for className merging instead of array joining
- Add `outline` and `fullWidth` props
- Expand variants to include: primary, secondary, success, warning, error, info, ghost
- Expand sizes to include: xs, sm, md, lg, xl
- Add `dark:` classes for secondary/ghost variants
- Keep `forwardRef`, `isLoading` spinner, and `disabled` behavior

- [ ] **Step 2: Create Button stories**

Create `Button.stories.tsx` (replacing any existing version) with:
- Add new variant stories (Success, Warning, Error, Info)
- Add Outline story
- Update Sizes story to show all 5 sizes
- Add FullWidth story
- Update argTypes to include all variants and sizes

- [ ] **Step 3: Verify storybook loads**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/components/primitives/Button.tsx packages/shared/src/components/primitives/Button.stories.tsx
git commit -m "refactor: upgrade Button to full design system with variants and dark mode"
```

---

### Task 10: Add Card component

**Files:**
- Create: `packages/shared/src/components/primitives/Card.tsx`
- Create: `packages/shared/src/components/primitives/Card.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Card.tsx`

- [ ] **Step 1: Create Card component**

Port from the API. Card has subcomponents: `CardHeader`, `CardBody`, `CardFooter`. Uses `cn()`, `forwardRef`, and the Object.assign pattern for subcomponent composition. Includes `hoverable` prop for interactive shadow on hover. Uses design token classes: `bg-card`, `text-card-foreground`, `border-border`, `shadow-sm`, with `dark:` variants.

- [ ] **Step 2: Create Card stories**

Stories: Default, WithHeader, WithFooter, FullCard (all subcomponents), Hoverable, CustomPadding.

- [ ] **Step 3: Add to barrel export**

Add to `packages/shared/src/components/primitives/index.ts`:
```typescript
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card';
```

- [ ] **Step 4: Verify types and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Card.tsx packages/shared/src/components/primitives/Card.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Card primitive component"
```

---

### Task 11: Add Input component

**Files:**
- Create: `packages/shared/src/components/primitives/Input.tsx`
- Create: `packages/shared/src/components/primitives/Input.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Input.tsx`

- [ ] **Step 1: Create Input component**

Port from API. Props: `size`, `error` (string), `fullWidth`. Uses `cn()`, `forwardRef`. Includes error state styling (red border/ring), disabled state, Escape key blur behavior, `aria-invalid` when error is set. Uses design token classes for border, background, ring colors with `dark:` variants.

- [ ] **Step 2: Create Input stories**

Stories: Default, WithError, Disabled, Sizes, FullWidth, WithPlaceholder.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Input.tsx packages/shared/src/components/primitives/Input.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Input primitive component"
```

---

### Task 12: Add Badge component

**Files:**
- Create: `packages/shared/src/components/primitives/Badge.tsx`
- Create: `packages/shared/src/components/primitives/Badge.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Badge.tsx`

- [ ] **Step 1: Create Badge component**

Port from API. Props: `variant`, `size` (sm/md), `dot` (boolean for status indicator), `outline`. Uses `cn()`, variant classes for colors, `forwardRef`. Dot indicator uses a small colored circle before the label.

- [ ] **Step 2: Create Badge stories**

Stories: AllVariants, Sizes, WithDot, Outline.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Badge.tsx packages/shared/src/components/primitives/Badge.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Badge primitive component"
```

---

### Task 13: Add Label component

**Files:**
- Create: `packages/shared/src/components/primitives/Label.tsx`
- Create: `packages/shared/src/components/primitives/Label.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Label.tsx`

- [ ] **Step 1: Create Label component**

Port from API. Props: `htmlFor`, `required` (shows asterisk), `disabled` (visual opacity). Uses `cn()`, `forwardRef` on `<label>` element. Required asterisk has sr-only "(required)" text for accessibility.

- [ ] **Step 2: Create Label stories**

Stories: Default, Required, Disabled.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Label.tsx packages/shared/src/components/primitives/Label.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Label primitive component"
```

---

### Task 14: Add Skeleton component

**Files:**
- Create: `packages/shared/src/components/primitives/Skeleton.tsx`
- Create: `packages/shared/src/components/primitives/Skeleton.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Skeleton.tsx`

- [ ] **Step 1: Create Skeleton component**

Port from API. Props: `width`, `height` (number or string), `rounded` (boolean), `variant` ('line' | 'circle' | 'card'), `className`. Uses the `.animate-shimmer` class from `base.css`. Includes `aria-live="polite"` and `aria-busy="true"` for accessibility. Uses stone-based colors with `dark:` variants.

- [ ] **Step 2: Create Skeleton stories**

Stories: Line, Circle, Card, CustomSize, MultiplePlaceholders (showing a typical loading layout).

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Skeleton.tsx packages/shared/src/components/primitives/Skeleton.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Skeleton primitive component"
```

---

### Task 15: Add LoadingSpinner component

**Files:**
- Create: `packages/shared/src/components/primitives/LoadingSpinner.tsx`
- Create: `packages/shared/src/components/primitives/LoadingSpinner.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/LoadingSpinner.tsx`

- [ ] **Step 1: Create LoadingSpinner component**

Port from API. Props: `size` (Size type), `className`, `aria-label`. SVG-based animated spinner. Size maps to pixel dimensions via `iconSizes` from variants. Uses `role="status"` for accessibility.

- [ ] **Step 2: Create LoadingSpinner stories**

Stories: Default, AllSizes, WithLabel.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/LoadingSpinner.tsx packages/shared/src/components/primitives/LoadingSpinner.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add LoadingSpinner primitive component"
```

---

## Chunk 3: Primitive Components (Part 2 — Form + Interactive)

### Task 16: Add Select component

**Files:**
- Create: `packages/shared/src/components/primitives/Select.tsx`
- Create: `packages/shared/src/components/primitives/Select.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Select.tsx`

- [ ] **Step 1: Create Select component**

Port from API. Props: `options` (array of `{value, label}`), `value`, `onChange`, `size`, `error`, `fullWidth`. Native `<select>` with custom styling. Base64 encoded SVG custom arrow. Error state with red border/ring. Escape key blur. `aria-invalid` when error set.

- [ ] **Step 2: Create Select stories**

Stories: Default, WithOptions, WithError, Disabled, Sizes, FullWidth.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Select.tsx packages/shared/src/components/primitives/Select.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Select primitive component"
```

---

### Task 17: Add Textarea component

**Files:**
- Create: `packages/shared/src/components/primitives/Textarea.tsx`
- Create: `packages/shared/src/components/primitives/Textarea.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Textarea.tsx`

- [ ] **Step 1: Create Textarea component**

Port from API. Props: `size`, `error`, `fullWidth`, `rows`. Same patterns as Input — error state, Escape key blur, `aria-invalid`, `forwardRef`. Min-height 80px, resize-y only.

- [ ] **Step 2: Create Textarea stories**

Stories: Default, WithError, Disabled, CustomRows.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Textarea.tsx packages/shared/src/components/primitives/Textarea.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Textarea primitive component"
```

---

### Task 18: Add Checkbox component

**Files:**
- Create: `packages/shared/src/components/primitives/Checkbox.tsx`
- Create: `packages/shared/src/components/primitives/Checkbox.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Checkbox.tsx`

- [ ] **Step 1: Create Checkbox component**

Port from API. Props: `checked`, `onChange`, `label`, `size`, `error`. Custom-styled checkbox with base64 SVG checkmark. Uses `cn()`, `forwardRef`. Error state with `aria-invalid`. Disabled state styling.

- [ ] **Step 2: Create Checkbox stories**

Stories: Default, Checked, WithLabel, Disabled, Error.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Checkbox.tsx packages/shared/src/components/primitives/Checkbox.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Checkbox primitive component"
```

---

### Task 19: Add Switch component

**Files:**
- Create: `packages/shared/src/components/primitives/Switch.tsx`
- Create: `packages/shared/src/components/primitives/Switch.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Switch.tsx`

- [ ] **Step 1: Create Switch component**

Port from API. Props: `checked`, `onChange`, `label`, `size`. Uses `role="switch"` for accessibility. Pseudo-element knob with translate animation on toggle. Primary color when checked, stone when unchecked.

- [ ] **Step 2: Create Switch stories**

Stories: Default, Checked, WithLabel, Disabled.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Switch.tsx packages/shared/src/components/primitives/Switch.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Switch primitive component"
```

---

### Task 20: Add Avatar component

**Files:**
- Create: `packages/shared/src/components/primitives/Avatar.tsx`
- Create: `packages/shared/src/components/primitives/Avatar.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/Avatar.tsx`

- [ ] **Step 1: Create Avatar component**

Port from API. Props: `src`, `alt`, `size` (Size type), `fallback` (string or ReactNode). Displays image with onError fallback to initials/text in a colored circle. Size variants map to pixel dimensions. `forwardRef` on outer `div`.

- [ ] **Step 2: Create Avatar stories**

Stories: WithImage, WithFallback, AllSizes, BrokenImage (showing fallback).

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/Avatar.tsx packages/shared/src/components/primitives/Avatar.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add Avatar primitive component"
```

---

### Task 21: Add FilterChip component

**Files:**
- Create: `packages/shared/src/components/primitives/FilterChip.tsx`
- Create: `packages/shared/src/components/primitives/FilterChip.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/FilterChip.tsx`

- [ ] **Step 1: Create FilterChip component**

Port from API. Props: `label`, `onRemove`, `variant`, `size`. Pill-shaped chip with X button for removal. Note: the API uses `lucide-react` for the X icon — since we don't want that dependency in widgets, use an inline SVG `<path>` for the X icon instead.

- [ ] **Step 2: Create FilterChip stories**

Stories: Default, WithRemove, AllVariants.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/FilterChip.tsx packages/shared/src/components/primitives/FilterChip.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add FilterChip primitive component"
```

---

### Task 22: Add EmptyState component

**Files:**
- Create: `packages/shared/src/components/primitives/EmptyState.tsx`
- Create: `packages/shared/src/components/primitives/EmptyState.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/EmptyState.tsx`

- [ ] **Step 1: Create EmptyState component**

Port from API. Props: `icon` (ReactNode), `title` (required string), `description` (optional string), `action` (optional ReactNode). Centered layout with icon, title, description, and action slot.

- [ ] **Step 2: Create EmptyState stories**

Stories: Default, WithDescription, WithAction, WithIcon.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/EmptyState.tsx packages/shared/src/components/primitives/EmptyState.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add EmptyState primitive component"
```

---

### Task 23: Add IndeterminateProgress component

**Files:**
- Create: `packages/shared/src/components/primitives/IndeterminateProgress.tsx`
- Create: `packages/shared/src/components/primitives/IndeterminateProgress.stories.tsx`
- Modify: `packages/shared/src/components/primitives/index.ts`

**Reference:** `../../perimeter-api/src/components/ui/primitives/IndeterminateProgress.tsx`

- [ ] **Step 1: Create IndeterminateProgress component**

Port from API. Props: `className`, `visible` (boolean). Uses `framer-motion` for the sliding animation. Requires parent to have `position: relative`. Primary color bar slides left-to-right continuously.

- [ ] **Step 2: Create IndeterminateProgress stories**

Stories: Default, Hidden.

- [ ] **Step 3: Add to barrel export and commit**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
git add packages/shared/src/components/primitives/IndeterminateProgress.tsx packages/shared/src/components/primitives/IndeterminateProgress.stories.tsx packages/shared/src/components/primitives/index.ts
git commit -m "feat: add IndeterminateProgress primitive component"
```

---

## Chunk 4: Motion System

### Task 24: Add motion config

**Files:**
- Create: `packages/shared/src/lib/motion/config.ts`

**Reference:** `../../perimeter-api/src/lib/motion/config.ts` — port verbatim.

- [ ] **Step 1: Create motion config**

Copy the API's `config.ts` exactly. It contains:
- Springs: snappy, gentle, bouncy
- Durations: fast, base, slow, entrance
- Easings: easeOut, easeInOut
- Staggers: fast, base, slow
- Transition presets: fast, base, slow, entrance, snappy, gentle, bouncy
- Variant presets: fadeVariants, slideUpVariants, slideDownVariants, scaleInVariants, slideRightVariants, slideLeftVariants, pageSlideVariants, modalBackdropVariants, modalPanelVariants, staggerContainer(), staggerItemVariants

All imports from `framer-motion` (just the `Transition` and `Variants` types).

- [ ] **Step 2: Verify types**

```bash
pnpm typecheck --filter @perimeter-widgets/shared
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/lib/motion/config.ts
git commit -m "feat: add Framer Motion config with presets and variants"
```

---

### Task 25: Add FadeIn, SlideUp, ScaleIn motion components

**Files:**
- Create: `packages/shared/src/components/motion/FadeIn.tsx`
- Create: `packages/shared/src/components/motion/SlideUp.tsx`
- Create: `packages/shared/src/components/motion/ScaleIn.tsx`
- Create: `packages/shared/src/components/motion/FadeIn.stories.tsx`
- Create: `packages/shared/src/components/motion/SlideUp.stories.tsx`
- Create: `packages/shared/src/components/motion/ScaleIn.stories.tsx`

**Reference:** `../../perimeter-api/src/components/ui/motion/FadeIn.tsx`, `SlideUp.tsx`, `ScaleIn.tsx`

- [ ] **Step 1: Create the three simple motion wrapper components**

Port from API. Each wraps children in `motion.div` with the corresponding variant preset from config. Props: `delay` (number), plus all `HTMLMotionProps<'div'>`. Uses `initial="hidden"`, `animate="visible"`, `exit="exit"`.

Import variants from `../../lib/motion/config` (relative path).

- [ ] **Step 2: Create stories for each**

Each story shows the animation with a replay mechanism (using a key state to remount).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/components/motion/FadeIn.tsx packages/shared/src/components/motion/SlideUp.tsx packages/shared/src/components/motion/ScaleIn.tsx packages/shared/src/components/motion/*.stories.tsx
git commit -m "feat: add FadeIn, SlideUp, ScaleIn motion components"
```

---

### Task 26: Add AnimatedList and AnimatedPanel

**Files:**
- Create: `packages/shared/src/components/motion/AnimatedList.tsx`
- Create: `packages/shared/src/components/motion/AnimatedPanel.tsx`
- Create: `packages/shared/src/components/motion/AnimatedList.stories.tsx`
- Create: `packages/shared/src/components/motion/AnimatedPanel.stories.tsx`

**Reference:** `../../perimeter-api/src/components/ui/motion/AnimatedList.tsx`, `AnimatedPanel.tsx`

- [ ] **Step 1: Create AnimatedList**

Port from API. Props: `as` ('div' | 'ul' | 'ol'), `staggerDelay` (number), children. Uses `staggerContainer()` and `staggerItemVariants` from config. Wraps each child in a `motion.div` (or `motion.li` for list containers). Uses `AnimatePresence` for exit animations.

- [ ] **Step 2: Create AnimatedPanel**

Port from API. Props: `isOpen`, `onClose`, `width` (default 380px), `showBackdrop`. Fixed positioning on right side. Uses `slideRightVariants` and `modalBackdropVariants` from config. Escape key to close. `AnimatePresence` for enter/exit.

- [ ] **Step 3: Create stories and commit**

```bash
git add packages/shared/src/components/motion/AnimatedList.tsx packages/shared/src/components/motion/AnimatedPanel.tsx packages/shared/src/components/motion/*.stories.tsx
git commit -m "feat: add AnimatedList and AnimatedPanel motion components"
```

---

### Task 27: Add CountUp and SkeletonTransition

**Files:**
- Create: `packages/shared/src/components/motion/CountUp.tsx`
- Create: `packages/shared/src/components/motion/SkeletonTransition.tsx`
- Create: `packages/shared/src/components/motion/CountUp.stories.tsx`
- Create: `packages/shared/src/components/motion/SkeletonTransition.stories.tsx`

**Reference:** `../../perimeter-api/src/components/ui/motion/CountUp.tsx`, `SkeletonTransition.tsx`

- [ ] **Step 1: Create CountUp**

Port from API. Props: `value` (number), `format` (optional function), `stiffness`, `damping`. Uses `useSpring` and `useTransform` from framer-motion. Updates `span.textContent` directly via `useMotionValueEvent` for performance.

- [ ] **Step 2: Create SkeletonTransition**

Port from API. Props: `isLoading` (boolean), `skeleton` (ReactNode), `children`. Uses `AnimatePresence` with mode="wait". Fades between skeleton and content using `fadeVariants`.

- [ ] **Step 3: Create stories and commit**

```bash
git add packages/shared/src/components/motion/CountUp.tsx packages/shared/src/components/motion/SkeletonTransition.tsx packages/shared/src/components/motion/*.stories.tsx
git commit -m "feat: add CountUp and SkeletonTransition motion components"
```

---

### Task 28: Create motion barrel export

**Files:**
- Create: `packages/shared/src/components/motion/index.ts`

- [ ] **Step 1: Create barrel export**

Create `packages/shared/src/components/motion/index.ts` with component AND type exports:

```typescript
export { FadeIn } from './FadeIn';
export { SlideUp } from './SlideUp';
export { ScaleIn } from './ScaleIn';
export { AnimatedList } from './AnimatedList';
export { AnimatedPanel } from './AnimatedPanel';
export { CountUp } from './CountUp';
export { SkeletonTransition } from './SkeletonTransition';

// Re-export prop types for consumers
export type { FadeInProps } from './FadeIn';
export type { SlideUpProps } from './SlideUp';
export type { ScaleInProps } from './ScaleIn';
export type { AnimatedListProps } from './AnimatedList';
export type { AnimatedPanelProps } from './AnimatedPanel';
export type { CountUpProps } from './CountUp';
export type { SkeletonTransitionProps } from './SkeletonTransition';
```

(Each motion component should export a named props type alongside the component.)

- [ ] **Step 2: Add motion subpath exports to `package.json`**

Add to `packages/shared/package.json` exports field:

```json
"./components/motion": "./src/components/motion/index.ts",
"./motion": "./src/lib/motion/config.ts"
```

Motion is subpath-only by design — it is NOT re-exported from the main `index.ts` to avoid bundling framer-motion into widgets that don't use motion. Consumers import via:
- `import { FadeIn } from '@perimeter-widgets/shared/components/motion'`
- `import { fadeVariants } from '@perimeter-widgets/shared/motion'`

- [ ] **Step 3: Verify full build**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm typecheck --filter @perimeter-widgets/shared
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/components/motion/index.ts packages/shared/package.json
git commit -m "feat: add motion components barrel export and subpath entries"
```

---

## Chunk 5: Storybook Integration

### Task 29: Update Storybook preview with theme decorator

**Files:**
- Modify: `packages/shared/.storybook/preview.ts`

- [ ] **Step 1: Update preview.ts with theme toolbar and decorator**

Replace contents of `packages/shared/.storybook/preview.ts`:

```typescript
import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/base.css';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    globalTypes: {
        theme: {
            description: 'Theme mode',
            toolbar: {
                title: 'Theme',
                icon: 'sun',
                items: [
                    { value: 'light', title: 'Light', icon: 'sun' },
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: 'light',
    },
    decorators: [
        (Story, context) => {
            const theme = context.globals.theme;
            return React.createElement(
                'div',
                {
                    className: 'storybook-root',
                    'data-theme': theme === 'dark' ? 'dark' : undefined,
                    style: { padding: '1rem' },
                },
                React.createElement(Story),
            );
        },
    ],
};

export default preview;
```

- [ ] **Step 2: Verify storybook starts**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets/packages/shared
pnpm storybook --ci 2>&1 | head -20
```

Expected: Storybook compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/.storybook/preview.ts
git commit -m "feat: add theme switching decorator to Storybook"
```

---

### Task 30: Add design token documentation stories — Colors

**Files:**
- Create: `packages/shared/src/stories/Colors.stories.tsx`

- [ ] **Step 1: Create Colors story**

Create a story under "Design System/Colors" that renders all semantic colors (primary, success, warning, error) and surface colors (background, foreground, card, muted, accent, popover, destructive, border, input, ring) as visual swatches. Each swatch shows the color, hex value, and CSS variable name. Organize in sections: Semantic Colors, Surface Colors, Base Scale. Responds to the dark mode toolbar toggle via the `.storybook-root` wrapper.

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/stories/Colors.stories.tsx
git commit -m "feat: add Colors design token documentation story"
```

---

### Task 31: Add design token documentation stories — Typography, Spacing, Shadows, Radius

**Files:**
- Create: `packages/shared/src/stories/Typography.stories.tsx`
- Create: `packages/shared/src/stories/Spacing.stories.tsx`
- Create: `packages/shared/src/stories/Shadows.stories.tsx`
- Create: `packages/shared/src/stories/BorderRadius.stories.tsx`

- [ ] **Step 1: Create Typography story**

"Design System/Typography" — renders font size scale (xs through 4xl) with sample text at each size, plus font weight examples (normal, medium, semibold, bold).

- [ ] **Step 2: Create Spacing story**

"Design System/Spacing" — renders spacing scale (xs through 3xl) as colored bars with labels showing rem and px values.

- [ ] **Step 3: Create Shadows story**

"Design System/Shadows" — renders cards showing each shadow level (xs through 2xl) side by side.

- [ ] **Step 4: Create BorderRadius story**

"Design System/Border Radius" — renders boxes with each radius token applied (none through full) with labels.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/stories/
git commit -m "feat: add Typography, Spacing, Shadows, BorderRadius documentation stories"
```

---

### Task 32: Update design tokens doc

**Files:**
- Modify: `docs/reference/design-tokens.md` (this file already exists per the CLAUDE.md context loading table)

- [ ] **Step 1: Update the design tokens reference doc**

Rewrite `docs/reference/design-tokens.md` to reflect the expanded token system:
- Add all new token categories (surface colors, base scale, spacing, typography, shadows, transitions, z-index)
- Document the two-layer architecture (`:host` runtime + `@theme` static)
- Document dark mode via `data-theme="dark"` attribute
- Document runtime override path for WordPress admins
- Update the shadow DOM reset section

- [ ] **Step 2: Commit**

```bash
git add docs/reference/design-tokens.md
git commit -m "docs: update design tokens reference for expanded token system"
```

---

### Task 33: Final verification

- [ ] **Step 1: Run full quality check**

```bash
cd /Users/parkerb/dev/perimeter/claude/perimeter-widgets
pnpm quality
```

Expected: All checks pass (typecheck, lint, format, test).

- [ ] **Step 2: Fix any issues found**

Address lint errors, type errors, or formatting issues. Re-run `pnpm quality` until clean.

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve quality check issues"
```

---

## File Summary

### Created Files
| File | Purpose |
|---|---|
| `packages/shared/src/types/ui.ts` | Shared UI type definitions |
| `packages/shared/src/components/utils/cn.ts` | className merging utility |
| `packages/shared/src/components/utils/variants.ts` | Centralized variant mappings |
| `packages/shared/src/components/primitives/index.ts` | Primitives barrel export |
| `packages/shared/src/components/primitives/Card.tsx` | Card component |
| `packages/shared/src/components/primitives/Input.tsx` | Input component |
| `packages/shared/src/components/primitives/Badge.tsx` | Badge component |
| `packages/shared/src/components/primitives/Avatar.tsx` | Avatar component |
| `packages/shared/src/components/primitives/Checkbox.tsx` | Checkbox component |
| `packages/shared/src/components/primitives/Label.tsx` | Label component |
| `packages/shared/src/components/primitives/Select.tsx` | Select component |
| `packages/shared/src/components/primitives/Textarea.tsx` | Textarea component |
| `packages/shared/src/components/primitives/Switch.tsx` | Switch component |
| `packages/shared/src/components/primitives/Skeleton.tsx` | Skeleton component |
| `packages/shared/src/components/primitives/LoadingSpinner.tsx` | LoadingSpinner component |
| `packages/shared/src/components/primitives/FilterChip.tsx` | FilterChip component |
| `packages/shared/src/components/primitives/EmptyState.tsx` | EmptyState component |
| `packages/shared/src/components/primitives/IndeterminateProgress.tsx` | IndeterminateProgress component |
| `packages/shared/src/lib/motion/config.ts` | Framer Motion presets |
| `packages/shared/src/components/motion/FadeIn.tsx` | FadeIn animation wrapper |
| `packages/shared/src/components/motion/SlideUp.tsx` | SlideUp animation wrapper |
| `packages/shared/src/components/motion/ScaleIn.tsx` | ScaleIn animation wrapper |
| `packages/shared/src/components/motion/AnimatedList.tsx` | Staggered list animation |
| `packages/shared/src/components/motion/AnimatedPanel.tsx` | Slide-right panel |
| `packages/shared/src/components/motion/CountUp.tsx` | Animated number counter |
| `packages/shared/src/components/motion/SkeletonTransition.tsx` | Skeleton-to-content crossfade |
| `packages/shared/src/components/motion/index.ts` | Motion barrel export |
| `packages/shared/src/stories/Colors.stories.tsx` | Color token documentation |
| `packages/shared/src/stories/Typography.stories.tsx` | Typography token documentation |
| `packages/shared/src/stories/Spacing.stories.tsx` | Spacing token documentation |
| `packages/shared/src/stories/Shadows.stories.tsx` | Shadow token documentation |
| `packages/shared/src/stories/BorderRadius.stories.tsx` | Border radius documentation |
| All `*.stories.tsx` alongside components | Component stories (15 primitives + 7 motion) |

### Modified Files
| File | Change |
|---|---|
| `packages/shared/package.json` | Add dependencies + subpath exports |
| `packages/shared/src/styles/tokens.css` | Expand to full two-layer token system |
| `packages/shared/src/styles/base.css` | Add dark mode variant + base layer overrides |
| `packages/shared/src/shadow-dom/mount.tsx` | Add `data-theme` propagation |
| `packages/shared/src/index.ts` | Update barrel exports |
| `packages/shared/src/components/index.ts` | Add primitives + utilities exports |
| `packages/shared/src/components/primitives/Button.tsx` | Refactor to use design system |
| `packages/shared/src/components/primitives/Button.stories.tsx` | Rewrite stories for all variants |
| `packages/shared/.storybook/preview.ts` | Add theme decorator |
| `docs/reference/design-tokens.md` | Update for expanded token system |

### Moved Files
| From | To |
|---|---|
| `packages/shared/src/components/Button.tsx` | `packages/shared/src/components/primitives/Button.tsx` |
| `packages/shared/src/components/Button.stories.tsx` | `packages/shared/src/components/primitives/Button.stories.tsx` |

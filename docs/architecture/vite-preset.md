# Vite Preset

> **Scope:** Build config factory, test config factory, IIFE output, Tailwind v4 integration
> **Key files:** `packages/vite-preset/src/index.ts`, `packages/vite-preset/src/test-setup.ts`
> **Last verified:** 2026-03-18

---

## Overview

`@perimeter-widgets/vite-preset` eliminates config duplication across widgets. Every widget's `vite.config.ts` is 3 lines, and every `vitest.config.ts` is 1 line.

---

## `createWidgetConfig(options): UserConfig`

Produces a Vite library mode config for building a widget to a single IIFE.

```typescript
// packages/widget-sermons/vite.config.ts
import { createWidgetConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetConfig({
    name: 'sermons',
    entry: 'src/index.tsx',
});
```

| Option  | Type     | Description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `name`  | `string` | Widget name (used for output file and global variable) |
| `entry` | `string` | Entry point relative to the widget package root        |

### What it configures

| Setting                | Value                                       | Why                                    |
| ---------------------- | ------------------------------------------- | -------------------------------------- |
| Format                 | IIFE                                        | Single `<script>` tag embedding        |
| Output                 | `../../dist/<name>/<name>.js`               | Root `dist/` folder for CDN            |
| Global name            | `PerimeterWidget_<Name>`                    | Avoids collisions between widgets      |
| Plugins                | `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths` | React JSX + Tailwind v4 CSS + tsconfig path aliases |
| `envDir`               | Monorepo root (`../../`)                                            | Load `.env` files from monorepo root   |
| Minification           | esbuild                                     | Fast, good compression                 |
| Dynamic imports        | Inlined                                     | Single file output                     |
| `process.env.NODE_ENV` | Defined                                     | React production mode in builds        |

---

## `createWidgetTestConfig(): VitestUserConfig`

Produces a Vitest config with jsdom, globals, and jest-dom matchers.

```typescript
// packages/widget-sermons/vitest.config.ts
import { createWidgetTestConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetTestConfig();
```

### What it configures

| Setting     | Value                  | Why                                                 |
| ----------- | ---------------------- | --------------------------------------------------- |
| Environment | jsdom                  | DOM testing                                         |
| Globals     | `true`                 | `describe`, `it`, `expect` available without import |
| Setup files | `test-setup.ts`        | Loads `@testing-library/jest-dom/vitest` matchers   |
| CSS         | `false`                | Skip CSS processing in tests                        |
| Plugins     | `@vitejs/plugin-react`, `vite-tsconfig-paths` | React JSX transform + tsconfig path aliases         |

### `test-setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
```

This file is referenced by `createWidgetTestConfig()` and makes DOM matchers like `toBeInTheDocument()` available in all widget tests.

---

## Related Docs

- [Architecture Overview](overview.md) — Build pipeline context
- [Adding a Widget](../guides/adding-a-widget.md) — Uses the preset
- [Testing](../guides/testing.md) — Test config details

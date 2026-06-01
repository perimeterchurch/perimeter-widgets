# Creating a widget

This is the on-ramp for building a new embeddable widget on the streamlined platform. The fastest path is to copy `widgets/example` and edit three files. A widget renders inside a shadow root and is driven by the single `mount()` path in `@perimeter/widget-runtime` — the same code in the studio (dev) and in the shipped IIFE (prod), so what you see in the studio is what production renders.

## 1. Copy the example

```bash
cp -R widgets/example widgets/<your-widget>
rm -rf widgets/<your-widget>/dist widgets/<your-widget>/.turbo widgets/<your-widget>/tsconfig.tsbuildinfo
```

## 2. Register it in the workspace

Add the new directory to `pnpm-workspace.yaml`:

```yaml
packages:
  - 'studio'
  - 'packages/*'
  - 'widgets/example'
  - 'widgets/<your-widget>'
```

Then install so the workspace graph picks it up:

```bash
pnpm install
```

## 3. Name the package

In `widgets/<your-widget>/package.json`, change the package name:

```json
{
  "name": "@perimeter/widget-<your-widget>"
}
```

Leave the scripts, `exports`, and dependencies as-is — they already point at the right files (`exports` resolves to `src/widget.tsx` so the studio can import the definition with no CSS side effects).

## 4. Edit `src/widget.tsx` — the widget definition

This is the studio-importable definition (no CSS import here). Set the `name`, the auth mode, the config `schema`, and wire up your `App`:

```tsx
import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: '<your-widget>', // MUST match widgetConfig({ name }) and data-perimeter-widget
  auth: 'none', // or an auth mode if the widget needs a signed-in user
  schema: z.object({
    // host-page config arrives as data-* attributes; coerce numbers/booleans here
    greeting: z.string().default('Hello'),
    count: z.coerce.number().int().min(0).max(20).default(3),
  }),
  App: ({ config }) => <App config={config} />,
});
```

The `name` must match in three places: `defineWidget({ name })`, `widgetConfig({ name })` in `vite.config.ts`, and the host page's `data-perimeter-widget="<your-widget>"`.

Build your UI in `src/app.tsx` (and any additional components). Use `@perimeter/ui` components and Tailwind classes — `data-*` config (minus `data-theme-*`) is parsed against the schema and passed in as `config`. Booleans (`data-open="false"`) and numbers coerce automatically.

## 5. `src/entry.ts` — usually no change

`entry.ts` is the production IIFE bootstrap. It imports the compiled CSS as a `?inline` string and self-mounts. Nothing here needs editing beyond the fact that it imports `./widget` (which already carries your new `name`):

```ts
import css from './styles.css?inline';
import { autoMount, ensureGlobal } from '@perimeter/widget-runtime';
import widget from './widget';

widget.version = __PERIMETER_WIDGET_VERSION__;
ensureGlobal(widget, css);
autoMount(widget, css);
```

`css` is the single CSS source for both dev and prod. `__PERIMETER_WIDGET_VERSION__` is injected from `package.json` by `widgetConfig`.

## 6. `vite.config.ts` — set the name

```ts
import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: '<your-widget>' }));
```

`widgetConfig` builds `src/entry.ts` into a single self-contained `dist/index.js` IIFE (no separate CSS asset), pins `NODE_ENV=production`, injects the version, and applies the inline rem→px PostCSS transform so the widget is immune to the host page's `html { font-size }`.

## 7. Preview it live

```bash
pnpm dev
```

The Vite studio auto-discovers widgets via `import.meta.glob('/widgets/*/src/widget.tsx')` and lists yours automatically — no registry to hand-edit. Select it to preview through the real `mount()`, with live config editing, the theme editor, and HMR. Edit `src/app.tsx` and the preview hot-reloads.

## 8. Build the shippable bundle

```bash
pnpm --filter @perimeter/widget-<your-widget> build
```

This emits `dist/index.js` — a single IIFE that self-mounts on any element with `data-perimeter-widget="<your-widget>"` and renders identically to the studio preview.

## 9. Quality gate

Before opening a PR:

```bash
pnpm format
pnpm quality
```

`pnpm quality` runs typecheck + lint + test + `format:check` across the workspace. Run `pnpm format` first — the gate only checks formatting and fails on unformatted files.

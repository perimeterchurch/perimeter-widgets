# Creating a widget

This is the on-ramp for building a new embeddable widget on the streamlined platform. The fastest path is `pnpm create-widget <name>`, which scaffolds a correct, ready-to-build widget — no more copying the example by hand. A widget renders inside a shadow root and is driven by the single `mount()` path in `@perimeter/widget-runtime` — the same code in the studio (dev) and in the shipped IIFE (prod), so what you see in the studio is what production renders.

## 1. Scaffold the widget

```bash
pnpm create-widget <your-widget>
```

`<your-widget>` must be kebab-case and not already taken. This:

- Renders `widgets/<your-widget>/` from the template — `package.json` (`@perimeter/widget-<your-widget>` at `0.0.0`), `vite.config.ts` (`widgetConfig({ name })`), `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `src/` (`widget.tsx`, `app.tsx`, `entry.ts`, `styles.css`, `env.d.ts`), and starter `tests/` (a render guard + a bundle-budget check).
- Writes a stub doc at `docs/widgets/<your-widget>.mdx`.
- Runs `pnpm install` so the workspace graph picks up the new package and the lockfile is updated. The workspace globs `widgets/*`, so there is **no `pnpm-workspace.yaml` edit** — registration is automatic.

The name is already wired into all three places it must match (`defineWidget({ name })`, `widgetConfig({ name })`, and the host page's `data-perimeter-widget`).

> **Commit the updated `pnpm-lock.yaml`.** The scaffold's `pnpm install` changes the lockfile. Commit it before releasing — `pnpm release <name> --patch|--minor|--major` guards on a clean working tree and will refuse otherwise.

## 2. Edit `src/widget.tsx` — the widget definition

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

## 3. `src/entry.ts` — usually no change

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

## 4. `vite.config.ts` — already set

The scaffold already wrote your name into the build config:

```ts
import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: '<your-widget>' }));
```

`widgetConfig` builds `src/entry.ts` into a single self-contained `dist/index.js` IIFE (no separate CSS asset), pins `NODE_ENV=production`, injects the version, and applies the inline rem→px PostCSS transform so the widget is immune to the host page's `html { font-size }`.

## 5. Preview it live

```bash
pnpm dev
```

The Vite studio auto-discovers widgets via `import.meta.glob('/widgets/*/src/widget.tsx')` and lists yours automatically — no registry to hand-edit. It appears under **Widgets** in the sidebar marked `dev`, since it has no released bundle yet, and its page opens straight onto the **Dev** tab: the preview through the real `mount()`, with live config editing, the theme editor, and HMR. Edit `src/app.tsx` and the preview hot-reloads. Once you release it, the same page gains an **Embed** tab carrying the shipped bundle, the options playground, and the copyable snippet.

### Theming the preview

The studio has two theme layers. The **chrome** toggle in the sidebar sets the studio shell light/dark, and by default the widget preview and the component gallery **follow it** — darkening the studio darkens the preview (see `studio/src/lib/use-chrome-theme.ts`). The canvas toolbar above the preview has its own **Theme** toggle that can _pin_ an explicit light or dark for the widget only (`previewTheme = state.theme ?? chromeTheme`); a pinned value is stored in the share URL (`studio/src/lib/preview-link.ts`) so it travels with the link, while "follow chrome" stays out of the URL. This mirrors how a production embed opts into dark with `data-theme="dark"` on the host — so what you see in the preview is what a host page gets.

## 6. Build the shippable bundle

```bash
pnpm --filter @perimeter/widget-<your-widget> build
```

This emits `dist/index.js` — a single IIFE that self-mounts on any element with `data-perimeter-widget="<your-widget>"` and renders identically to the studio preview.

## 7. Quality gate

Before opening a PR:

```bash
pnpm format
pnpm quality
```

`pnpm quality` runs typecheck + lint + test + `format:check` across the workspace. Run `pnpm format` first — the gate only checks formatting and fails on unformatted files.

Visual and accessibility coverage that jsdom can't see (computed theme colors, loading states, the preview's follow-chrome behavior) lives in the studio's Playwright harness under `studio/visual/`. It's run separately from `pnpm quality`:

```bash
pnpm --filter @perimeter/studio visual
```

## 8. Release it

When the widget is ready to ship, `pnpm release <your-widget> --patch|--minor|--major` bumps the version, builds, publishes to `cdn/`, and opens a PR into `dev`. See [Hosting & Release](./hosting-and-release.md) for the full flow.

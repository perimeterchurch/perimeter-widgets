# Adding a Widget

> **Scope:** Step-by-step guide for creating a new widget from scratch
> **Key files:** `packages/widget-sermons/` (reference implementation)
> **Last verified:** 2026-03-18

> **Start here:** for the current copy-the-example on-ramp (the `widgetConfig({ name })` Vite helper, the per-widget `src/entry.ts`, and Vite-studio auto-discovery), follow [`docs/creating-a-widget.md`](../creating-a-widget.md). The checklist below predates the streamline rebuild and is kept for context; the hosting/embed steps are corrected for the static `cdn/` model.

---

## Checklist

### 1. Create the widget package

```bash
mkdir -p packages/widget-<name>/src
```

### 2. Create `packages/widget-<name>/package.json`

```json
{
    "name": "@perimeter-widgets/widget-<name>",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "src/index.tsx",
    "exports": {
        ".": "./src/index.tsx",
        "./app": "./src/App.tsx",
        "./styles": "./src/styles.css",
        "./types": "./src/types.ts"
    },
    "scripts": {
        "build": "vite build",
        "test": "vitest run",
        "typecheck": "tsc --noEmit",
        "lint": "eslint src/",
        "dev": "vite"
    },
    "dependencies": {
        "react": "^19",
        "react-dom": "^19",
        "@tanstack/react-query": "^5",
        "@perimeter-widgets/shared": "workspace:*",
        "zod": "^3"
    },
    "devDependencies": {
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "@perimeter-widgets/vite-preset": "workspace:*",
        "vite": "^6",
        "vitest": "^3",
        "@vitejs/plugin-react": "^4",
        "@testing-library/react": "^16",
        "@testing-library/jest-dom": "^6",
        "jsdom": "^26",
        "tailwindcss": "^4",
        "typescript": "^5.7"
    }
}
```

### 3. Create `vite.config.ts` (3 lines)

```typescript
import { createWidgetConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetConfig({
    name: '<name>',
    entry: 'src/index.tsx',
});
```

### 4. Create `vitest.config.ts` (1 line)

```typescript
import { createWidgetTestConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetTestConfig();
```

### 5. Create `tsconfig.json`

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src"]
}
```

### 6. Create `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />

declare module '*.css?inline' {
    const content: string;
    export default content;
}
```

### 7. Create `src/types.ts`

Define the widget's config schema and domain types:

```typescript
import { z } from 'zod';

export const WidgetConfigSchema = z.object({
    // Add widget-specific config fields here
});

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
```

### 8. Create `src/styles.css`

```css
@import 'tailwindcss';
@import '@perimeter-widgets/shared/styles';
```

### 9. Create `src/App.tsx`

```tsx
import { useConfig } from '@perimeter-widgets/shared';

export function WidgetApp() {
    const config = useConfig();
    return <div className='p-4'>Widget content here</div>;
}
```

### 10. Create `src/index.tsx` (entry point)

```tsx
import { mountWidget } from '@perimeter-widgets/shared';
import { WidgetApp } from './App';
import styles from './styles.css?inline';

mountWidget({
    elementId: 'perimeter-<name>',
    component: WidgetApp,
    styles,
    defaults: {
        // Default config values
    },
});
```

### 11. Add to storyboard widget registry

Add an entry to `packages/storyboard/src/registry.ts`:

```typescript
{
    id: '<name>',
    name: '<Display Name>',
    description: 'Short description of the widget',
    elementId: 'perimeter-<name>',
    status: 'skeleton', // 'ready' | 'skeleton' | 'planned'
    load: async () => {
        const [app, styles] = await Promise.all([
            import('@perimeter-widgets/widget-<name>/app'),
            import('@perimeter-widgets/widget-<name>/styles?inline'),
        ]);
        return {
            component: app.WidgetApp,
            styles: styles.default,
        };
    },
    configFields: [
        // Define editable data-* attributes here
        {
            key: 'fieldName',
            label: 'Field Label',
            type: 'text', // 'text' | 'number' | 'boolean' | 'select'
            defaultValue: '',
            description: 'Help text for this field',
        },
    ],
}
```

The storyboard will automatically pick it up with live config editing and embed code generation.

### 12. Build and verify

```bash
pnpm install
pnpm build --filter=@perimeter/widget-<name>
# Verify widgets/<name>/dist/index.js exists
```

### 13. Add documentation

Create `docs/widgets/<name>.md` with the widget's purpose, config options, and API endpoints.

### 14. Release and embed

Publish the built bundle to the static CDN with `pnpm release <name>` (copies it into the immutable `cdn/<name>/<version>/index.js`, updates `cdn/manifest.json` + the `latest.js` rewrites, commits). Then embed on WordPress:

```html
<div data-option="value"></div>
<script src="https://widgets.perimeter.org/<name>/latest.js" async></script>
```

`…/latest.js` always resolves to the current released version; pin to an immutable build with `…/<name>/<version>/index.js`. Full flow and embed reference: [`docs/hosting-and-release.md`](../hosting-and-release.md).

---

## API Integration

If the widget needs new API endpoints, create them in `perimeter-api` following the 5-layer architecture:

1. **Route** — `src/app/api/(public|authenticated)/<domain>/route.ts`
2. **Controller** — `src/controllers/<domain>/`
3. **Service** — `src/services/<domain>/`
4. **System** — `src/systems/mp/<domain>/` (or graph/sardius)
5. **Register** — `src/lib/di/registry.ts`

See `../perimeter-api/CLAUDE.md` for full conventions.

---

## Related Docs

- [Architecture Overview](../architecture/overview.md) — How widgets fit in the monorepo
- [Vite Preset](../architecture/vite-preset.md) — What the configs do
- [Widget Embed Guide](../reference/embed-guide.md) — WordPress embed patterns

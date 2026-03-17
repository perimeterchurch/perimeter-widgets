# Perimeter Widgets Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the perimeter-widgets Turborepo monorepo with shared packages, vite-preset, shadow DOM mounting, API client, auth utility, a sermons widget skeleton, Storybook for shared components, a storyboard for widget previews, and CI/CD pipeline.

**Architecture:** pnpm workspaces + Turborepo monorepo. Each widget is a separate package that builds to a self-contained IIFE via Vite library mode. Shared utilities (API client, auth, shadow DOM mount, components) live in `@perimeter-widgets/shared`. A `@perimeter-widgets/vite-preset` package eliminates per-widget config duplication. Widgets render inside shadow DOM for WordPress style isolation.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vite, Turborepo, React Query v5, Vitest, React Testing Library, Storybook, MSW, Zod

**Spec:** `docs/superpowers/specs/2026-03-16-perimeter-widgets-design.md`

**Note:** This plan scaffolds the widget infrastructure and a sermons widget skeleton with placeholder UI. The actual sermon components, hooks, and perimeter-api sermon routes will be implemented in a follow-up plan once the MP table schemas are explored.

---

## Chunk 1: Monorepo Foundation

### Task 1: Root Configuration Files

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `eslint.config.js`
- Create: `CLAUDE.md`

**Prerequisite:** The git repo has already been initialized on the `dev` branch with the spec document committed. `pnpm-lock.yaml` must be committed alongside dependency changes (the GitHub Action uses `--frozen-lockfile`).

- [ ] **Step 1: Create root `package.json`**

```json
{
    "name": "perimeter-widgets",
    "private": true,
    "scripts": {
        "dev": "turbo dev --filter=storyboard",
        "build": "turbo build",
        "test": "turbo test",
        "lint": "turbo lint",
        "typecheck": "turbo typecheck",
        "format": "prettier --write .",
        "storybook": "turbo storybook",
        "quality": "turbo typecheck lint test && prettier --check ."
    },
    "devDependencies": {
        "turbo": "^2",
        "prettier": "^3",
        "eslint": "^9",
        "typescript": "^5.7"
    },
    "packageManager": "pnpm@10.6.2",
    "engines": {
        "node": ">=20"
    }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
    - 'packages/*'
```

- [ ] **Step 3: Create `turbo.json`**

```jsonc
{
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
        "build": {
            "dependsOn": ["^build"],
            "outputs": ["dist/**"],
        },
        "test": {
            "dependsOn": ["^build"],
        },
        "dev": {
            "cache": false,
            "persistent": true,
        },
        "storybook": {
            "cache": false,
            "persistent": true,
        },
        "lint": {},
        "typecheck": {},
    },
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "jsx": "react-jsx",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "noUncheckedIndexedAccess": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true
    },
    "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
.turbo/
*.tsbuildinfo
.env
.env.local
.DS_Store
# dist/ is NOT ignored — committed for jsDelivr CDN serving
.superpowers/
```

- [ ] **Step 6: Create `.prettierrc`**

```json
{
    "semi": true,
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "all",
    "printWidth": 80
}
```

Match prettier config to perimeter-api conventions. Check perimeter-api's `.prettierrc` and adjust if different.

- [ ] **Step 7: Create `eslint.config.js`** (ESLint v9 flat config format)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
        },
    },
    prettier,
    {
        ignores: ['dist/', 'node_modules/', '.turbo/'],
    },
);
```

Add to root `package.json` devDependencies:

```json
"@eslint/js": "^9",
"typescript-eslint": "^8",
"eslint-plugin-react": "^7",
"eslint-plugin-react-hooks": "^5",
"eslint-config-prettier": "^10"
```

- [ ] **Step 8: Create `CLAUDE.md`**

See the CLAUDE.md content in Task 1 Step 8 below. This should include all commands, architecture overview, critical rules, and context loading instructions following the same format as `perimeter-api/CLAUDE.md`.

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow DOM for style isolation, and fetches data from `api.perimeter.org` (perimeter-api).

## Commands

| Command                              | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                           | Start widget storyboard (full widget previews)    |
| `pnpm build`                         | Build all widgets to `dist/`                      |
| `pnpm build --filter=widget-sermons` | Build a single widget                             |
| `pnpm test`                          | Run all widget tests via Turborepo                |
| `pnpm test --filter=widget-sermons`  | Run tests for a single widget                     |
| `pnpm storybook`                     | Start Storybook for shared components             |
| `pnpm lint`                          | Run ESLint across all packages                    |
| `pnpm typecheck`                     | TypeScript type checking                          |
| `pnpm quality`                       | Run all checks (typecheck + lint + format + test) |

## Architecture

### Monorepo Packages

| Package                 | Name                             | Purpose                                                                |
| ----------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `packages/shared/`      | `@perimeter-widgets/shared`      | API client, auth, shadow DOM mount, shared components, Tailwind preset |
| `packages/vite-preset/` | `@perimeter-widgets/vite-preset` | Shared Vite config factory for widgets                                 |
| `packages/storyboard/`  | `@perimeter-widgets/storyboard`  | Dev preview app for full widget testing with MSW mocking               |
| `packages/widget-*/`    | `@perimeter-widgets/widget-*`    | Individual widget packages                                             |

### Widget Build Pipeline

Each widget is a Vite library mode build that produces a single IIFE JS file in `dist/<name>/<name>.js`. CSS is inlined into the JS via `?inline` imports for shadow DOM injection. React is bundled into each widget (WordPress doesn't provide it).

### Shadow DOM Mounting

Widgets mount via `mountWidget()` from `@perimeter-widgets/shared`:

1. Finds target `<div>` by element ID
2. Reads `data-*` attributes as config
3. Creates shadow root with injected styles
4. Renders React app with providers (QueryClient, auth, config)

### Auth

Reads MP OAuth token from `localStorage` (`mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter`). Public widgets skip auth. Authenticated widgets attach token as `Authorization: Bearer <token>`.

### CDN Delivery

Built files in `dist/` are committed to the repo. Served via jsDelivr `@latest`. GitHub Action purges CDN cache on push to `main`.

## Critical Rules

- **Always use `pnpm`** — never npm or npx
- **Always create a branch** — never commit directly to `dev` or `main`
- **Merge target is `dev` only** — never merge directly to `main`
- **Never push to origin** — pushing is a manual task performed by the developer
- **Run `pnpm quality` before merging**
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Use `--body-file` for PR bodies** (avoids ANSI escape code injection)
- **Read docs before code** — check `docs/superpowers/specs/` for design specs before modifying architecture

## Adding a New Widget

1. Create `packages/widget-<name>/` with entry point, components, hooks, tests
2. Add 3-line `vite.config.ts` using `createWidgetConfig()` from `@perimeter-widgets/vite-preset`
3. Add 1-line `vitest.config.ts` using `createWidgetTestConfig()`
4. Add preview in `packages/storyboard/src/previews/<name>.tsx`
5. `pnpm build --filter=widget-<name>` — output lands in `dist/<name>/`
6. Commit dist, push to main — GitHub Action purges jsDelivr
7. Add `<div>` + `<script>` tag on WordPress once — never touch it again

## API Integration

Widgets fetch from `api.perimeter.org` (perimeter-api). New widget endpoints follow perimeter-api's 5-layer architecture (Route → Controller → Service → System → Provider). See `../perimeter-api/CLAUDE.md` for API conventions.
```

- [ ] **Step 9: Install dependencies**

Run: `pnpm install`

- [ ] **Step 10: Verify turbo runs**

Run: `pnpm turbo build`
Expected: No errors (no packages have build scripts yet, so it completes with no tasks)

- [ ] **Step 11: Commit**

```bash
git add -A  # includes pnpm-lock.yaml
git commit -m "chore: scaffold monorepo root with turbo, pnpm workspaces, and config"
```

---

### Task 2: Vite Preset Package

**Files:**

- Create: `packages/vite-preset/package.json`
- Create: `packages/vite-preset/tsconfig.json`
- Create: `packages/vite-preset/src/index.ts`

- [ ] **Step 1: Create `packages/vite-preset/package.json`**

```json
{
    "name": "@perimeter-widgets/vite-preset",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "src/index.ts",
    "types": "src/index.ts",
    "scripts": {
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "vite": "^6",
        "@vitejs/plugin-react": "^4",
        "@tailwindcss/vite": "^4",
        "vitest": "^3",
        "@testing-library/react": "^16",
        "@testing-library/jest-dom": "^6",
        "jsdom": "^26"
    }
}
```

- [ ] **Step 2: Create `packages/vite-preset/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/vite-preset/src/index.ts`**

```typescript
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import type { UserConfig as VitestUserConfig } from 'vitest/config';

interface WidgetConfigOptions {
    name: string;
    entry: string;
}

export function createWidgetConfig(options: WidgetConfigOptions): UserConfig {
    const { name, entry } = options;
    const globalName = `PerimeterWidget_${name.charAt(0).toUpperCase() + name.slice(1)}`;

    return {
        plugins: [react(), tailwindcss()],
        build: {
            lib: {
                entry: resolve(process.cwd(), entry),
                name: globalName,
                formats: ['iife'],
                fileName: () => `${name}.js`,
            },
            outDir: resolve(process.cwd(), `../../dist/${name}`),
            emptyOutDir: true,
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify(
                process.env.NODE_ENV || 'production',
            ),
        },
    };
}

export function createWidgetTestConfig(): VitestUserConfig {
    return {
        plugins: [react()],
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: [resolve(import.meta.dirname, 'test-setup.ts')],
            css: false,
        },
    };
}
```

- [ ] **Step 3b: Create `packages/vite-preset/src/test-setup.ts`**

This setup file configures jest-dom matchers for all widget tests:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Install and verify**

Run: `cd /path/to/perimeter-widgets && pnpm install`
Run: `pnpm typecheck --filter=@perimeter-widgets/vite-preset`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/vite-preset/
git commit -m "feat: add vite-preset package with createWidgetConfig and createWidgetTestConfig"
```

---

### Task 3: Shared Package — Foundation

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/styles/tokens.css`
- Create: `packages/shared/src/styles/base.css`
- Create: `packages/shared/src/utils/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
    "name": "@perimeter-widgets/shared",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "src/index.ts",
    "types": "src/index.ts",
    "exports": {
        ".": "./src/index.ts",
        "./styles": "./src/styles/base.css",
        "./styles/tokens": "./src/styles/tokens.css"
    },
    "scripts": {
        "typecheck": "tsc --noEmit",
        "lint": "eslint src/",
        "storybook": "storybook dev -p 6006",
        "build-storybook": "storybook build"
    },
    "dependencies": {
        "react": "^19",
        "react-dom": "^19",
        "@tanstack/react-query": "^5",
        "zod": "^3"
    },
    "devDependencies": {
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "tailwindcss": "^4",
        "typescript": "^5.7"
    }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/shared/src/styles/tokens.css`**

Tailwind v4 uses CSS-first configuration via `@theme` directives. This file defines all shared design tokens.

```css
@theme {
    /* Primary */
    --color-primary: #5b5bd6;
    --color-primary-hover: #4e4ec2;
    --color-primary-active: #4343b0;
    --color-primary-foreground: #ffffff;

    /* Success */
    --color-success: #46a758;
    --color-success-hover: #3d9a4e;
    --color-success-foreground: #ffffff;

    /* Warning */
    --color-warning: #f5a623;
    --color-warning-hover: #e09915;
    --color-warning-foreground: #ffffff;

    /* Error */
    --color-error: #e54666;
    --color-error-hover: #d63a59;
    --color-error-foreground: #ffffff;

    /* Font */
    --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

    /* Border radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
}
```

Remove the `tailwind.preset.ts` file from the plan — the JS preset approach is Tailwind v3. In v4, widgets import `tokens.css` in their CSS entry.

- [ ] **Step 4: Create `packages/shared/src/styles/base.css`**

```css
@import 'tailwindcss';
@import './tokens.css';

/* Base reset for shadow DOM context */
:host {
    all: initial;
    display: block;
    font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
    color: #1c1917;
    line-height: 1.5;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}
```

- [ ] **Step 5: Create `packages/shared/src/index.ts`**

```typescript
// Shadow DOM
export { mountWidget } from './shadow-dom/mount';
export type { MountWidgetOptions, WidgetConfig } from './shadow-dom/mount';

// API Client
export { createApiClient } from './api/client';
export type { ApiClient, ApiClientOptions } from './api/client';

// Auth
export { getMPToken, AuthProvider, useAuth } from './auth/mp-token';
export type { MPAuthState } from './auth/mp-token';

// Config
export { ConfigProvider, useConfig } from './shadow-dom/config';

// React Query
export { createQueryClient } from './api/query-client';
```

**Important:** This will error on typecheck until we create the referenced modules in Tasks 4-6. Do NOT run `pnpm typecheck` on the shared package until Task 6 is complete. The commit at the end of this task is fine — we're committing the foundation structure.

- [ ] **Step 5b: Create `packages/shared/src/utils/index.ts`** (placeholder for future helpers)

```typescript
// Shared utility functions for all widgets
// Add common helpers here as needed
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`

- [ ] **Step 7: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package foundation with tailwind tokens and base styles"
```

---

## Chunk 2: Shared Package — Core Modules

### Task 4: Shadow DOM Mount Utility

**Files:**

- Create: `packages/shared/src/shadow-dom/mount.tsx`
- Create: `packages/shared/src/shadow-dom/config.tsx`

- [ ] **Step 1: Create `packages/shared/src/shadow-dom/config.tsx`**

```tsx
import { createContext, useContext, type ReactNode } from 'react';

export type WidgetConfig = Record<string, string | number | boolean>;

const ConfigContext = createContext<WidgetConfig | null>(null);

export function ConfigProvider({
    config,
    children,
}: {
    config: WidgetConfig;
    children: ReactNode;
}) {
    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig<T extends WidgetConfig = WidgetConfig>(): T {
    const ctx = useContext(ConfigContext);
    if (!ctx) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return ctx as T;
}

/**
 * Reads data-* attributes from an HTML element and converts them to a config object.
 * Converts kebab-case to camelCase: data-per-page -> perPage
 * Attempts to parse numbers and booleans from string values.
 */
export function parseDataAttributes(element: HTMLElement): WidgetConfig {
    const config: WidgetConfig = {};

    for (const [key, value] of Object.entries(element.dataset)) {
        if (value === 'true') {
            config[key] = true;
        } else if (value === 'false') {
            config[key] = false;
        } else if (value !== '' && !isNaN(Number(value))) {
            config[key] = Number(value);
        } else {
            config[key] = value ?? '';
        }
    }

    return config;
}
```

- [ ] **Step 2: Create `packages/shared/src/shadow-dom/mount.tsx`**

```tsx
import { type ComponentType, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../api/query-client';
import { AuthProvider } from '../auth/mp-token';
import {
    ConfigProvider,
    parseDataAttributes,
    type WidgetConfig,
} from './config';

export interface MountWidgetOptions {
    /** ID of the target DOM element (e.g., 'perimeter-sermons') */
    elementId: string;
    /** Root React component to render */
    component: ComponentType<Record<string, never>>;
    /** Compiled CSS string to inject into the shadow root */
    styles: string;
    /** Default config values (overridden by data-* attributes) */
    defaults?: WidgetConfig;
    /** Whether this widget requires authentication */
    requiresAuth?: boolean;
}

export interface MountResult {
    destroy: () => void;
}

export function mountWidget(options: MountWidgetOptions): MountResult | null {
    const {
        elementId,
        component: Component,
        styles,
        defaults = {},
        requiresAuth = false,
    } = options;

    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(
            `[perimeter-widgets] Target element #${elementId} not found`,
        );
        return null;
    }

    // Reuse existing shadow root or create new one (handles HMR/re-mount)
    const shadowRoot =
        element.shadowRoot || element.attachShadow({ mode: 'open' });

    // Clear previous content (placeholder HTML or previous widget mount)
    shadowRoot.innerHTML = '';

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);

    // Create mount point inside shadow root
    const mountPoint = document.createElement('div');
    mountPoint.id = 'widget-root';
    shadowRoot.appendChild(mountPoint);

    // Parse config from data attributes
    const dataConfig = parseDataAttributes(element);
    const config = { ...defaults, ...dataConfig };

    // Create isolated QueryClient
    const queryClient = createQueryClient();

    // Mount React
    let root: Root | null = createRoot(mountPoint);

    root.render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <AuthProvider requiresAuth={requiresAuth}>
                    <ConfigProvider config={config}>
                        <Component />
                    </ConfigProvider>
                </AuthProvider>
            </QueryClientProvider>
        </StrictMode>,
    );

    return {
        destroy: () => {
            if (root) {
                root.unmount();
                root = null;
                queryClient.clear();
            }
        },
    };
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/shadow-dom/
git commit -m "feat: add shadow DOM mount utility and config context"
```

---

### Task 5: API Client

**Files:**

- Create: `packages/shared/src/api/client.ts`
- Create: `packages/shared/src/api/query-client.ts`

- [ ] **Step 1: Create `packages/shared/src/api/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    });
}
```

- [ ] **Step 2: Create `packages/shared/src/api/client.ts`**

```typescript
import { getMPToken } from '../auth/mp-token';

export interface ApiClientOptions {
    baseUrl?: string;
    requiresAuth?: boolean;
}

export interface ApiClient {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        count?: number;
        cached?: boolean;
    };
}

const DEFAULT_BASE_URL = 'https://api.perimeter.org';

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
    const { baseUrl = DEFAULT_BASE_URL, requiresAuth = false } = options;

    async function request<T>(path: string, init?: RequestInit): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(init?.headers as Record<string, string>),
        };

        // Attach auth token if available and required
        if (requiresAuth) {
            const auth = getMPToken();
            if (auth.authenticated) {
                headers['Authorization'] = `Bearer ${auth.token}`;
            }
        }

        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers,
        });

        if (response.status === 401) {
            // Token expired or invalid — surface to caller
            throw new ApiError('Session expired', 401, 'TOKEN_EXPIRED');
        }

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new ApiError(
                errorBody?.message || `Request failed: ${response.status}`,
                response.status,
                errorBody?.code,
            );
        }

        const json: ApiResponse<T> = await response.json();

        if (!json.success) {
            throw new ApiError('API returned unsuccessful response', 500);
        }

        return json.data;
    }

    return {
        get<T>(path: string): Promise<T> {
            return request<T>(path);
        },
        post<T>(path: string, body?: unknown): Promise<T> {
            return request<T>(path, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });
        },
    };
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/api/
git commit -m "feat: add API client with response envelope unwrapping and query client factory"
```

---

### Task 6: Auth Utility

**Files:**

- Create: `packages/shared/src/auth/mp-token.tsx`

- [ ] **Step 1: Create `packages/shared/src/auth/mp-token.tsx`**

```tsx
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';

// localStorage keys used by WordPress's MP OAuth integration
const TOKEN_KEY = 'mpp-widgets_AuthToken';
const EXPIRY_KEY = 'mpp-widgets_ExpiresAfter';

export interface MPAuthState {
    authenticated: boolean;
    token?: string;
}

/**
 * Reads the MP OAuth token from localStorage.
 * Returns { authenticated: true, token } if valid, { authenticated: false } otherwise.
 */
export function getMPToken(): MPAuthState {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiresAfter = localStorage.getItem(EXPIRY_KEY);

        if (!token || token === 'null' || token.length < 10) {
            return { authenticated: false };
        }

        if (expiresAfter && new Date(expiresAfter) < new Date()) {
            return { authenticated: false };
        }

        return { authenticated: true, token };
    } catch {
        // localStorage may not be available (SSR, iframe restrictions)
        return { authenticated: false };
    }
}

interface AuthContextValue extends MPAuthState {
    refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    requiresAuth,
    children,
}: {
    requiresAuth: boolean;
    children: ReactNode;
}) {
    const [authState, setAuthState] = useState<MPAuthState>(() =>
        requiresAuth ? getMPToken() : { authenticated: false },
    );

    const refresh = useCallback(() => {
        if (requiresAuth) {
            setAuthState(getMPToken());
        }
    }, [requiresAuth]);

    // Listen for storage events (token changes from other tabs)
    useEffect(() => {
        if (!requiresAuth) return;

        const handleStorage = (e: StorageEvent) => {
            if (e.key === TOKEN_KEY || e.key === EXPIRY_KEY) {
                refresh();
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [requiresAuth, refresh]);

    return (
        <AuthContext.Provider value={{ ...authState, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/auth/
git commit -m "feat: add MP token auth utility and AuthProvider context"
```

---

### Task 7: Shared Package — Tests

**Files:**

- Create: `packages/shared/src/shadow-dom/__tests__/config.test.ts`
- Create: `packages/shared/src/shadow-dom/__tests__/mount.test.tsx`
- Create: `packages/shared/src/api/__tests__/client.test.ts`
- Create: `packages/shared/src/auth/__tests__/mp-token.test.ts`
- Create: `packages/shared/vitest.config.ts`

- [ ] **Step 1: Create `packages/shared/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [
            new URL(
                '../node_modules/@perimeter-widgets/vite-preset/src/test-setup.ts',
                import.meta.url,
            ).pathname,
        ],
        css: false,
    },
});
```

Add to `packages/shared/package.json` scripts:

```json
"test": "vitest run"
```

Add to devDependencies:

```json
"vitest": "^3",
"@vitejs/plugin-react": "^4",
"@testing-library/react": "^16",
"@testing-library/jest-dom": "^6",
"jsdom": "^26"
```

- [ ] **Step 2: Write `parseDataAttributes` test**

Create `packages/shared/src/shadow-dom/__tests__/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseDataAttributes } from '../config';

describe('parseDataAttributes', () => {
    it('converts data attributes to camelCase config', () => {
        const el = document.createElement('div');
        el.dataset.campus = 'buckhead';
        el.dataset.perPage = '12';

        const config = parseDataAttributes(el);
        expect(config).toEqual({
            campus: 'buckhead',
            perPage: 12,
        });
    });

    it('parses boolean values', () => {
        const el = document.createElement('div');
        el.dataset.showFilters = 'true';
        el.dataset.compact = 'false';

        const config = parseDataAttributes(el);
        expect(config).toEqual({
            showFilters: true,
            compact: false,
        });
    });

    it('returns empty object for element with no data attributes', () => {
        const el = document.createElement('div');
        const config = parseDataAttributes(el);
        expect(config).toEqual({});
    });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/shadow-dom/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 4: Write `getMPToken` test**

Create `packages/shared/src/auth/__tests__/mp-token.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMPToken } from '../mp-token';

describe('getMPToken', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns authenticated: false when no token', () => {
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for null token', () => {
        localStorage.setItem('mpp-widgets_AuthToken', 'null');
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: false for short token', () => {
        localStorage.setItem('mpp-widgets_AuthToken', 'short');
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for valid token', () => {
        const token = 'a-valid-access-token-that-is-long-enough';
        localStorage.setItem('mpp-widgets_AuthToken', token);
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });

    it('returns authenticated: false for expired token', () => {
        localStorage.setItem(
            'mpp-widgets_AuthToken',
            'a-valid-access-token-that-is-long-enough',
        );
        localStorage.setItem(
            'mpp-widgets_ExpiresAfter',
            new Date(Date.now() - 60000).toISOString(),
        );
        expect(getMPToken()).toEqual({ authenticated: false });
    });

    it('returns authenticated: true for non-expired token', () => {
        const token = 'a-valid-access-token-that-is-long-enough';
        localStorage.setItem('mpp-widgets_AuthToken', token);
        localStorage.setItem(
            'mpp-widgets_ExpiresAfter',
            new Date(Date.now() + 3600000).toISOString(),
        );
        expect(getMPToken()).toEqual({ authenticated: true, token });
    });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/auth/__tests__/mp-token.test.ts`
Expected: PASS

- [ ] **Step 5b: Write `mountWidget` test**

Create `packages/shared/src/shadow-dom/__tests__/mount.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { mountWidget } from '../mount';

function TestComponent() {
    return <div data-testid='test-widget'>Hello Widget</div>;
}

describe('mountWidget', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('returns null if target element does not exist', () => {
        const result = mountWidget({
            elementId: 'nonexistent',
            component: TestComponent,
            styles: '',
        });
        expect(result).toBeNull();
    });

    it('creates a shadow root on the target element', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mountWidget({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(el.shadowRoot).not.toBeNull();
    });

    it('injects styles into the shadow root', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mountWidget({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '.test { color: red; }',
        });

        const styleTag = el.shadowRoot?.querySelector('style');
        expect(styleTag?.textContent).toContain('.test { color: red; }');
    });

    it('returns a destroy function that unmounts the widget', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        const result = mountWidget({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(result).not.toBeNull();
        expect(result!.destroy).toBeInstanceOf(Function);

        // Should not throw
        result!.destroy();
    });

    it('reuses existing shadow root on re-mount', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mountWidget({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        const shadowRoot = el.shadowRoot;

        // Re-mount should not throw
        const result = mountWidget({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(result).not.toBeNull();
        expect(el.shadowRoot).toBe(shadowRoot);
    });
});
```

Note: jsdom's `attachShadow` support is limited — some assertions about rendered content inside the shadow root may not work. These tests focus on the mount lifecycle (shadow root creation, style injection, cleanup, re-mount safety). If jsdom `attachShadow` is unavailable, the tests will need a polyfill or skip — add a note in the test file.

- [ ] **Step 5c: Run mount tests**

Run: `cd packages/shared && pnpm vitest run src/shadow-dom/__tests__/mount.test.tsx`
Expected: PASS (or skip with note if jsdom lacks shadow DOM support)

- [ ] **Step 6: Write API client test**

Create `packages/shared/src/api/__tests__/client.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiClient, ApiError } from '../client';

describe('createApiClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('unwraps success response envelope', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () =>
                Promise.resolve({
                    success: true,
                    data: [{ id: 1, title: 'Test Sermon' }],
                }),
        });

        const client = createApiClient({ baseUrl: 'https://api.test.com' });
        const result = await client.get('/api/sermons');
        expect(result).toEqual([{ id: 1, title: 'Test Sermon' }]);
    });

    it('throws ApiError on non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: () =>
                Promise.resolve({
                    message: 'Not found',
                    code: 'NOT_FOUND',
                }),
        });

        const client = createApiClient({ baseUrl: 'https://api.test.com' });
        await expect(client.get('/api/sermons/999')).rejects.toThrow(ApiError);
    });

    it('throws ApiError with TOKEN_EXPIRED on 401', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve({}),
        });

        const client = createApiClient({
            baseUrl: 'https://api.test.com',
            requiresAuth: true,
        });

        try {
            await client.get('/api/protected');
            expect.fail('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(ApiError);
            expect((e as ApiError).code).toBe('TOKEN_EXPIRED');
        }
    });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/api/__tests__/client.test.ts`
Expected: PASS

- [ ] **Step 8: Run all shared tests**

Run: `cd packages/shared && pnpm test`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add packages/shared/
git commit -m "test: add tests for config parser, MP token auth, and API client"
```

---

## Chunk 3: Widget Sermons Skeleton & Build Verification

### Task 8: Sermons Widget Skeleton

**Files:**

- Create: `packages/widget-sermons/package.json`
- Create: `packages/widget-sermons/tsconfig.json`
- Create: `packages/widget-sermons/vite.config.ts`
- Create: `packages/widget-sermons/vitest.config.ts`
- Create: `packages/widget-sermons/src/index.tsx`
- Create: `packages/widget-sermons/src/App.tsx`
- Create: `packages/widget-sermons/src/styles.css`
- Create: `packages/widget-sermons/src/types.ts`

- [ ] **Step 1: Create `packages/widget-sermons/package.json`**

```json
{
    "name": "@perimeter-widgets/widget-sermons",
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
        "tailwindcss": "^4",
        "typescript": "^5.7"
    }
}
```

- [ ] **Step 2: Create `packages/widget-sermons/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/widget-sermons/vite.config.ts`**

```typescript
import { createWidgetConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetConfig({
    name: 'sermons',
    entry: 'src/index.tsx',
});
```

- [ ] **Step 4: Create `packages/widget-sermons/vitest.config.ts`**

```typescript
import { createWidgetTestConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetTestConfig();
```

- [ ] **Step 5: Create `packages/widget-sermons/src/types.ts`**

```typescript
import { z } from 'zod';

/** Widget configuration from data-* attributes */
export const SermonsConfigSchema = z.object({
    campus: z.string().optional(),
    perPage: z.number().default(12),
    apiUrl: z.string().default('https://api.perimeter.org'),
});

export type SermonsConfig = z.infer<typeof SermonsConfigSchema>;

/** Placeholder types — will be replaced with real types from MP schema */
export interface Sermon {
    id: number;
    title: string;
    speaker: string;
    date: string;
    seriesId?: number;
    seriesName?: string;
    description?: string;
    videoUrl?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
}

export interface SermonSeries {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    sermonCount: number;
}
```

- [ ] **Step 6: Create `packages/widget-sermons/src/styles.css`**

```css
@import 'tailwindcss';
@import '@perimeter-widgets/shared/styles';

/* Widget-specific styles can be added here */
```

Note: The Tailwind content paths need to be configured. Add a `tailwind.config.ts` if Tailwind v4 requires explicit content paths for this package, or rely on Vite's automatic content detection. Test during build and adjust.

- [ ] **Step 7: Create `packages/widget-sermons/src/App.tsx`**

```tsx
import { useConfig } from '@perimeter-widgets/shared';
import type { SermonsConfig } from './types';

export function SermonsApp() {
    const config = useConfig<SermonsConfig>();

    return (
        <div className='p-4'>
            <h2 className='text-2xl font-bold text-stone-900 mb-4'>Sermons</h2>
            <p className='text-stone-600'>
                Sermons widget is loading. Campus: {config.campus ?? 'all'}
            </p>
            <p className='text-sm text-stone-400 mt-2'>
                This is a placeholder — sermon components will be built once the
                API endpoints are ready.
            </p>
        </div>
    );
}
```

- [ ] **Step 8: Create `packages/widget-sermons/src/index.tsx`**

```tsx
import { mountWidget } from '@perimeter-widgets/shared';
import { SermonsApp } from './App';
import styles from './styles.css?inline';

mountWidget({
    elementId: 'perimeter-sermons',
    component: SermonsApp,
    styles,
    defaults: {
        perPage: 12,
        apiUrl: 'https://api.perimeter.org',
    },
});
```

- [ ] **Step 9: Install dependencies and build**

Run: `pnpm install`
Run: `pnpm build --filter=widget-sermons`
Expected: Build succeeds, `dist/sermons/sermons.js` is created

- [ ] **Step 10: Verify the output file exists and is an IIFE**

Run: `head -5 dist/sermons/sermons.js`
Expected: Should start with an IIFE wrapper like `(function(){` or `var PerimeterWidget_Sermons=...`

- [ ] **Step 11: Commit**

```bash
git add packages/widget-sermons/ dist/sermons/
git commit -m "feat: add sermons widget skeleton with shadow DOM mount and IIFE build"
```

---

### Task 9: Sermons Widget Test

**Files:**

- Create: `packages/widget-sermons/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write App test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
    createQueryClient,
    AuthProvider,
    ConfigProvider,
} from '@perimeter-widgets/shared';
import { SermonsApp } from '../App';

function renderWithProviders(config: Record<string, unknown> = {}) {
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider requiresAuth={false}>
                <ConfigProvider
                    config={{ campus: 'buckhead', perPage: 12, ...config }}
                >
                    <SermonsApp />
                </ConfigProvider>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

describe('SermonsApp', () => {
    it('renders the sermons heading', () => {
        renderWithProviders();
        expect(screen.getByText('Sermons')).toBeInTheDocument();
    });

    it('displays the configured campus', () => {
        renderWithProviders({ campus: 'buckhead' });
        expect(screen.getByText(/Campus: buckhead/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test --filter=widget-sermons`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/widget-sermons/src/__tests__/
git commit -m "test: add sermons widget App component tests"
```

---

## Chunk 4: Storybook & Storyboard

### Task 10: Shared Component — Button (First Storybook Component)

**Files:**

- Create: `packages/shared/src/components/Button.tsx`
- Create: `packages/shared/src/components/Button.stories.tsx`
- Create: `packages/shared/src/components/index.ts`

- [ ] **Step 1: Create `packages/shared/src/components/Button.tsx`**

```tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const variantClasses = {
    primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary:
        'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-200',
    ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
} as const;

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            className = '',
            children,
            ...props
        },
        ref,
    ) {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`
                    inline-flex items-center justify-center
                    rounded-md font-medium
                    transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${variantClasses[variant]}
                    ${sizeClasses[size]}
                    ${className}
                `.trim()}
                {...props}
            >
                {isLoading ?
                    <span className='mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                :   null}
                {children}
            </button>
        );
    },
);
```

- [ ] **Step 2: Create `packages/shared/src/components/index.ts`**

```typescript
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

- [ ] **Step 3: Update `packages/shared/src/index.ts`** to export components

Add to the existing exports:

```typescript
// Components
export { Button } from './components';
export type { ButtonProps } from './components';
```

- [ ] **Step 4: Create `packages/shared/src/components/Button.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
    title: 'Primitives/Button',
    component: Button,
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'ghost'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
    args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Ghost: Story = {
    args: { children: 'Ghost Button', variant: 'ghost' },
};

export const Loading: Story = {
    args: { children: 'Loading...', isLoading: true },
};

export const Disabled: Story = {
    args: { children: 'Disabled', disabled: true },
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button size='sm'>Small</Button>
            <Button size='md'>Medium</Button>
            <Button size='lg'>Large</Button>
        </div>
    ),
};
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/components/
git commit -m "feat: add Button component with Storybook stories"
```

---

### Task 11: Storybook Configuration

**Files:**

- Create: `packages/shared/.storybook/main.ts`
- Create: `packages/shared/.storybook/preview.ts`

- [ ] **Step 1: Install Storybook dependencies**

Add to `packages/shared/package.json` devDependencies:

```json
"@storybook/react": "^8",
"@storybook/react-vite": "^8",
"@storybook/addon-essentials": "^8",
"storybook": "^8"
```

Run: `pnpm install`

- [ ] **Step 2: Create `packages/shared/.storybook/main.ts`**

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-essentials'],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
};

export default config;
```

- [ ] **Step 3: Create `packages/shared/.storybook/preview.ts`**

```typescript
import type { Preview } from '@storybook/react';
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
};

export default preview;
```

- [ ] **Step 4: Verify Storybook starts**

Run: `cd packages/shared && pnpm storybook`
Expected: Storybook opens in browser on port 6006, Button stories render

- [ ] **Step 5: Commit**

```bash
git add packages/shared/.storybook/ packages/shared/package.json
git commit -m "feat: add Storybook configuration for shared components"
```

---

### Task 12: Storyboard (Widget Preview App)

**Files:**

- Create: `packages/storyboard/package.json`
- Create: `packages/storyboard/tsconfig.json`
- Create: `packages/storyboard/vite.config.ts`
- Create: `packages/storyboard/index.html`
- Create: `packages/storyboard/src/main.tsx`
- Create: `packages/storyboard/src/App.tsx`
- Create: `packages/storyboard/src/previews/sermons.tsx`
- Create: `packages/storyboard/src/mocks/handlers.ts`
- Create: `packages/storyboard/src/mocks/data/sermons.ts`
- Create: `packages/storyboard/src/styles.css`

- [ ] **Step 1: Create `packages/storyboard/package.json`**

```json
{
    "name": "@perimeter-widgets/storyboard",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "react": "^19",
        "react-dom": "^19",
        "@perimeter-widgets/shared": "workspace:*",
        "@perimeter-widgets/widget-sermons": "workspace:*"
    },
    "devDependencies": {
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "@vitejs/plugin-react": "^4",
        "@tailwindcss/vite": "^4",
        "vite": "^6",
        "tailwindcss": "^4",
        "msw": "^2",
        "typescript": "^5.7"
    }
}
```

- [ ] **Step 2: Create `packages/storyboard/tsconfig.json`**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src",
        "noUnusedLocals": false,
        "noUnusedParameters": false
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/storyboard/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5180,
    },
});
```

- [ ] **Step 4: Create `packages/storyboard/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Perimeter Widgets — Storyboard</title>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
    </body>
</html>
```

- [ ] **Step 5: Create `packages/storyboard/src/styles.css`**

```css
@import 'tailwindcss';

body {
    font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
    margin: 0;
    background: #fafaf9;
    color: #1c1917;
}
```

- [ ] **Step 6: Create `packages/storyboard/src/mocks/data/sermons.ts`**

```typescript
// Types are duplicated here for mock data — the canonical types live in the widget package.
// When the widget types stabilize, consider moving shared domain types to @perimeter-widgets/shared.

interface Sermon {
    id: number;
    title: string;
    speaker: string;
    date: string;
    seriesId?: number;
    seriesName?: string;
    description?: string;
    videoUrl?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
}

interface SermonSeries {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    sermonCount: number;
}

export const mockSeries: SermonSeries[] = [
    {
        id: 1,
        name: 'The Gospel of John',
        description: 'A verse-by-verse study through the Gospel of John.',
        imageUrl: 'https://placehold.co/600x400?text=Gospel+of+John',
        sermonCount: 12,
    },
    {
        id: 2,
        name: 'Psalms of Praise',
        description: 'Exploring the Psalms and their relevance today.',
        imageUrl: 'https://placehold.co/600x400?text=Psalms',
        sermonCount: 8,
    },
];

export const mockSermons: Sermon[] = [
    {
        id: 1,
        title: 'In the Beginning Was the Word',
        speaker: 'Pastor John Smith',
        date: '2026-03-15',
        seriesId: 1,
        seriesName: 'The Gospel of John',
        description: 'An introduction to the Gospel of John.',
        videoUrl: 'https://example.com/video/1',
        audioUrl: 'https://example.com/audio/1',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+1',
    },
    {
        id: 2,
        title: 'The Light Shines in the Darkness',
        speaker: 'Pastor John Smith',
        date: '2026-03-08',
        seriesId: 1,
        seriesName: 'The Gospel of John',
        description: 'John 1:5 - The light shines in the darkness.',
        videoUrl: 'https://example.com/video/2',
        audioUrl: 'https://example.com/audio/2',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+2',
    },
    {
        id: 3,
        title: 'Praise the Lord, O My Soul',
        speaker: 'Pastor Jane Doe',
        date: '2026-03-01',
        seriesId: 2,
        seriesName: 'Psalms of Praise',
        description: 'A look at Psalm 103.',
        thumbnailUrl: 'https://placehold.co/400x225?text=Sermon+3',
    },
];
```

- [ ] **Step 7: Create `packages/storyboard/src/mocks/handlers.ts`**

```typescript
import { http, HttpResponse } from 'msw';
import { mockSermons, mockSeries } from './data/sermons';

export const handlers = [
    http.get('https://api.perimeter.org/api/sermons', () => {
        return HttpResponse.json({
            success: true,
            data: mockSermons,
            meta: { count: mockSermons.length },
        });
    }),

    http.get('https://api.perimeter.org/api/sermons/series', () => {
        return HttpResponse.json({
            success: true,
            data: mockSeries,
            meta: { count: mockSeries.length },
        });
    }),

    http.get('https://api.perimeter.org/api/sermons/:id', ({ params }) => {
        const sermon = mockSermons.find((s) => s.id === Number(params.id));
        if (!sermon) {
            return HttpResponse.json(
                { success: false, message: 'Not found' },
                { status: 404 },
            );
        }
        return HttpResponse.json({ success: true, data: sermon });
    }),
];
```

- [ ] **Step 8: Create `packages/storyboard/src/previews/sermons.tsx`**

```tsx
export function SermonsPreview() {
    return (
        <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-stone-800'>
                Sermons Widget
            </h3>
            <p className='text-sm text-stone-500'>
                This preview mounts the sermons widget inside a shadow DOM
                container, exactly as it would appear on perimeter.org.
            </p>

            {/* The actual widget mount target — simulates the WordPress embed */}
            <div className='border border-stone-200 rounded-lg overflow-hidden'>
                <div
                    id='perimeter-sermons'
                    data-campus='buckhead'
                    data-per-page='12'
                />
            </div>

            <p className='text-xs text-stone-400'>
                Element: <code>#perimeter-sermons</code> | Config:
                campus=buckhead, perPage=12
            </p>
        </div>
    );
}
```

- [ ] **Step 9: Create `packages/storyboard/src/App.tsx`**

```tsx
import { useState } from 'react';
import { SermonsPreview } from './previews/sermons';

const widgets = [
    { id: 'sermons', name: 'Sermons', component: SermonsPreview },
] as const;

export function App() {
    const [active, setActive] = useState<string>('sermons');
    const ActiveWidget = widgets.find((w) => w.id === active)?.component;

    return (
        <div className='min-h-screen'>
            {/* Header */}
            <header className='bg-white border-b border-stone-200 px-6 py-4'>
                <h1 className='text-xl font-bold text-stone-900'>
                    Perimeter Widgets — Storyboard
                </h1>
                <p className='text-sm text-stone-500 mt-1'>
                    Preview widgets as they appear on perimeter.org
                </p>
            </header>

            <div className='flex'>
                {/* Sidebar */}
                <nav className='w-56 border-r border-stone-200 bg-white p-4 min-h-[calc(100vh-73px)]'>
                    <h2 className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3'>
                        Widgets
                    </h2>
                    <ul className='space-y-1'>
                        {widgets.map((w) => (
                            <li key={w.id}>
                                <button
                                    onClick={() => setActive(w.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        active === w.id ?
                                            'bg-primary text-white'
                                        :   'text-stone-700 hover:bg-stone-100'
                                    }`}
                                >
                                    {w.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Preview area */}
                <main className='flex-1 p-8'>
                    {ActiveWidget ?
                        <ActiveWidget />
                    :   null}
                </main>
            </div>
        </div>
    );
}
```

- [ ] **Step 10: Create `packages/storyboard/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function bootstrap() {
    // Start MSW in development
    if (import.meta.env.DEV) {
        const { setupWorker } = await import('msw/browser');
        const { handlers } = await import('./mocks/handlers');
        const worker = setupWorker(...handlers);
        await worker.start({
            onUnhandledRequest: 'bypass',
        });
    }

    const root = document.getElementById('root');
    if (!root) throw new Error('Root element not found');

    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

bootstrap();
```

Note: The storyboard loads the widget preview, but the actual shadow DOM mount happens via the widget's `index.tsx` entry point. For the storyboard, we need to dynamically import the widget's mount script after the preview element is in the DOM. The `SermonsPreview` component renders the target `<div>`, then we need to trigger the widget mount. This can be done with a `useEffect` that dynamically imports the widget entry. Update `sermons.tsx` preview accordingly:

```tsx
import { useEffect, useRef } from 'react';
import { mountWidget, type MountResult } from '@perimeter-widgets/shared';

export function SermonsPreview() {
    const mountRef = useRef<MountResult | null>(null);

    useEffect(() => {
        // Dynamically import and mount the widget after target element renders
        import('@perimeter-widgets/widget-sermons/app').then(
            ({ SermonsApp }) => {
                import('@perimeter-widgets/widget-sermons/styles?inline').then(
                    (styles) => {
                        mountRef.current = mountWidget({
                            elementId: 'perimeter-sermons',
                            component: SermonsApp,
                            styles: styles.default,
                            defaults: { perPage: 12 },
                        });
                    },
                );
            },
        );

        return () => {
            // Cleanup on unmount (handles StrictMode double-mount in dev)
            mountRef.current?.destroy();
            mountRef.current = null;
        };
    }, []);

    return (
        <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-stone-800'>
                Sermons Widget
            </h3>
            <p className='text-sm text-stone-500'>
                This preview mounts the sermons widget inside a shadow DOM
                container, exactly as it would appear on perimeter.org.
            </p>
            <div className='border border-stone-200 rounded-lg overflow-hidden'>
                <div
                    id='perimeter-sermons'
                    data-campus='buckhead'
                    data-per-page='12'
                />
            </div>
            <p className='text-xs text-stone-400'>
                Element: <code>#perimeter-sermons</code> | Config:
                campus=buckhead, perPage=12
            </p>
        </div>
    );
}
```

- [ ] **Step 11: Initialize MSW**

Run: `cd packages/storyboard && pnpm dlx msw init public/ --save`
Expected: Creates `public/mockServiceWorker.js`

- [ ] **Step 12: Install dependencies and verify dev server starts**

Run: `pnpm install`
Run: `pnpm dev`
Expected: Storyboard opens at `http://localhost:5180`, shows sidebar with "Sermons" widget, clicking it mounts the sermons widget skeleton inside a shadow DOM

- [ ] **Step 13: Commit**

```bash
git add packages/storyboard/
git commit -m "feat: add storyboard widget preview app with MSW mocking"
```

---

## Chunk 5: Manifest, CI/CD & Final Verification

### Task 13: Build Manifest Generator

**Files:**

- Create: `scripts/generate-manifest.ts`
- Modify: Root `package.json` — add `postbuild` script

- [ ] **Step 1: Create `scripts/generate-manifest.ts`**

```typescript
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const DIST_DIR = resolve(import.meta.dirname, '../dist');

interface ManifestEntry {
    file: string;
    sizeBytes: number;
    buildTimestamp: string;
}

interface Manifest {
    widgets: Record<string, ManifestEntry>;
}

function generateManifest(): void {
    const manifest: Manifest = { widgets: {} };

    let entries: string[];
    try {
        entries = readdirSync(DIST_DIR);
    } catch {
        console.log('No dist/ directory found. Skipping manifest generation.');
        return;
    }

    for (const entry of entries) {
        const entryPath = join(DIST_DIR, entry);
        const stat = statSync(entryPath);

        if (!stat.isDirectory()) continue;

        const jsFile = `${entry}.js`;
        const jsPath = join(entryPath, jsFile);

        try {
            const jsStat = statSync(jsPath);
            manifest.widgets[entry] = {
                file: `dist/${entry}/${jsFile}`,
                sizeBytes: jsStat.size,
                buildTimestamp: new Date().toISOString(),
            };
        } catch {
            console.warn(`Warning: ${jsPath} not found, skipping.`);
        }
    }

    const outputPath = join(DIST_DIR, 'manifest.json');
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Manifest written to ${outputPath}`);
    console.log(`Widgets: ${Object.keys(manifest.widgets).join(', ')}`);
}

generateManifest();
```

- [ ] **Step 2: Update root `package.json`**

Add `tsx` to devDependencies and a `postbuild` script:

```json
"scripts": {
    "postbuild": "tsx scripts/generate-manifest.ts"
}
```

```json
"devDependencies": {
    "tsx": "^4"
}
```

- [ ] **Step 3: Run build and verify manifest**

Run: `pnpm install && pnpm build`
Expected: `dist/manifest.json` is created with the sermons widget entry

Run: `cat dist/manifest.json`
Expected:

```json
{
  "widgets": {
    "sermons": {
      "file": "dist/sermons/sermons.js",
      "sizeBytes": <number>,
      "buildTimestamp": "<ISO date>"
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ package.json dist/manifest.json
git commit -m "feat: add build manifest generator for CDN cache purging"
```

---

### Task 14: GitHub Action — Build & Purge

**Files:**

- Create: `.github/workflows/build-and-purge.yml`

- [ ] **Step 1: Create `.github/workflows/build-and-purge.yml`**

```yaml
name: Build and Purge CDN

on:
    push:
        branches: [main]

jobs:
    build-and-purge:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - uses: pnpm/action-setup@v4

            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'pnpm'

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Build all widgets
              run: pnpm build

            - name: Check for dist changes
              id: check-dist
              run: |
                  if git diff --quiet dist/; then
                    echo "changed=false" >> $GITHUB_OUTPUT
                  else
                    echo "changed=true" >> $GITHUB_OUTPUT
                  fi

            - name: Commit dist changes
              if: steps.check-dist.outputs.changed == 'true'
              run: |
                  git config user.name "github-actions[bot]"
                  git config user.email "github-actions[bot]@users.noreply.github.com"
                  git add dist/
                  git commit -m "chore: update built widget files"
                  git push

            - name: Purge jsDelivr cache
              if: steps.check-dist.outputs.changed == 'true'
              run: |
                  # Read manifest and purge each widget file
                  node -e "
                    const { readFileSync } = require('fs');
                    const manifest = JSON.parse(readFileSync('./dist/manifest.json', 'utf8'));
                    const widgets = Object.values(manifest.widgets);
                    (async () => {
                      for (const w of widgets) {
                        const url = 'https://purge.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/' + w.file;
                        console.log('Purging: ' + url);
                        const r = await fetch(url);
                        console.log('  Status: ' + r.status);
                      }
                    })();
                  "
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Action for building widgets and purging jsDelivr cache"
```

---

### Task 15: Final Quality Check & Verification

- [ ] **Step 1: Run full quality check**

Run: `pnpm quality`
Expected: All typecheck, lint, format, and test checks pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: All widgets build, manifest generated, `dist/sermons/sermons.js` exists

- [ ] **Step 3: Verify the widget works in a standalone HTML file**

Create a temporary test file (do NOT commit):

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Widget Test</title>
    </head>
    <body>
        <h1>WordPress Simulation</h1>
        <div id="perimeter-sermons" data-campus="buckhead" data-per-page="12">
            <div
                style="min-height:200px;background:#f5f5f4;border-radius:8px"
            ></div>
        </div>
        <script src="dist/sermons/sermons.js"></script>
    </body>
</html>
```

Open in browser and verify:

- Shadow DOM is created on the target element
- Placeholder content is replaced by the React widget
- Widget shows "Sermons" heading and campus config
- No WordPress style interference (shadow DOM isolation)

- [ ] **Step 4: Verify storyboard**

Run: `pnpm dev`
Expected: Storyboard loads, sermons widget preview works with MSW mocked data

- [ ] **Step 5: Final commit with any adjustments**

Fix any issues found during verification, then:

```bash
git add -A
git commit -m "chore: final adjustments after end-to-end verification"
```

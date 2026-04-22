import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Registry components use `@/lib/utils`, `@/hooks/*`, and `@/components/ui/*` on
// disk so the shadcn CLI can rewrite those aliases for external consumers.
// Inside this monorepo those imports resolve to paths under packages/registry/
// instead. Tsconfig paths cover typecheck; webpack aliases cover build-time
// resolution when Next transpiles the workspace registry package.
const REGISTRY_DIR = resolve(import.meta.dirname, '../../packages/registry');

const nextConfig: NextConfig = {
    output: 'export',
    transpilePackages: ['@perimeter-widgets/registry'],
    turbopack: {
        root: import.meta.dirname,
    },
    webpack: (config) => {
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            '@/lib/utils': resolve(REGISTRY_DIR, 'lib/utils.ts'),
            '@/hooks': resolve(REGISTRY_DIR, 'hooks'),
            '@/components/ui': resolve(REGISTRY_DIR, 'ui/perimeter'),
        };
        return config;
    },
};

export default nextConfig;

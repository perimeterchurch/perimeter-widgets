import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    transpilePackages: ['@perimeter-widgets/registry'],
    turbopack: {
        root: import.meta.dirname,
    },
};

export default nextConfig;

import type { NextConfig } from 'next';
import path from 'node:path';

const here = import.meta.dirname;
const distRoot = path.resolve(here, '../../dist');

const config: NextConfig = {
  // Opt out of Turbopack: the sermons widget uses `?raw` query imports which
  // Turbopack drops and parses as ES modules instead of returning source text.
  // Webpack's `asset/source` rule handles `?raw` natively with no extra packages.
  webpack(webpackConfig) {
    webpackConfig.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return webpackConfig;
  },
  async rewrites() {
    return [{ source: '/widget-bundles/:name.js', destination: '/api/widget-bundles/:name' }];
  },
  env: { WIDGET_DIST_ROOT: distRoot },
};

export default config;

import type { NextConfig } from 'next';
import path from 'node:path';

const here = import.meta.dirname;
const distRoot = path.resolve(here, '../../dist');

const config: NextConfig = {
  async rewrites() {
    return [{ source: '/widget-bundles/:name.js', destination: '/api/widget-bundles/:name' }];
  },
  env: { WIDGET_DIST_ROOT: distRoot },
};

export default config;

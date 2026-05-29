import type { NextConfig } from 'next';
import { corsHeaders } from './src/lib/cors';

const config: NextConfig = {
  async rewrites() {
    return [
      { source: '/:name/:version/index.js.map', destination: '/api/bundle-map/:name/:version' },
      { source: '/:name/:version/index.js', destination: '/api/bundle/:name/:version' },
      { source: '/:name/latest.js', destination: '/api/latest/:name' },
      { source: '/manifest.json', destination: '/api/manifest' },
    ];
  },
  headers: corsHeaders,
};

export default config;

/**
 * Studio dev-server proxy table. Extracted from vite.config.ts so it can be
 * unit-tested without importing the full config (which would drag vitest +
 * plugin types into the studio tsc program).
 *
 * `/s3-proxy`: the sermons widget rewrites S3 document URLs (PDFs) to a
 * same-origin `/s3-proxy/...` path in dev to dodge S3 CORS (see proxyS3Url in
 * widgets/sermons/src/lib/format.ts). The studio dev server — where widgets are
 * previewed — must forward that path to S3, or the request falls through to the
 * SPA index.html and react-pdf throws "Invalid PDF structure".
 */
export const devServerProxy = {
  '/s3-proxy': {
    target: 'https://perimeter-files.s3.amazonaws.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/s3-proxy/, ''),
  },
};

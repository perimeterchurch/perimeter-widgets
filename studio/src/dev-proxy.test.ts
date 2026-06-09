import { describe, it, expect } from 'vitest';
import { devServerProxy } from './dev-proxy';

// Guards the dev proxy that lets the studio preview load sermon PDFs: the widget
// rewrites S3 URLs to `/s3-proxy/...` (proxyS3Url) and the studio must forward
// that to S3, else react-pdf receives the SPA index.html ("Invalid PDF structure").
describe('studio dev server proxy', () => {
  it('forwards /s3-proxy to the perimeter-files S3 origin', () => {
    const p = devServerProxy['/s3-proxy'];
    expect(p.target).toBe('https://perimeter-files.s3.amazonaws.com');
    expect(p.changeOrigin).toBe(true);
    expect(p.rewrite('/s3-proxy/sermons/notes.pdf')).toBe('/sermons/notes.pdf');
  });
});

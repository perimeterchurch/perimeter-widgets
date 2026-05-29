# apps/cdn

Stateless CDN serving app for perimeter widgets. Deployed at `widgets.perimeter.org`.

## Architecture

The CDN is a stateless reader. Immutable versioned bundles are served straight from Vercel Blob with a one-year cache header. `latest.js` is a 302 redirect to the live versioned URL, resolved from KV on every request. Promotion and rollback (writes) happen only via the `pnpm publish-widget` script and the studio admin UI — the CDN itself never writes to the store.

## Route Table

| Route                          | Response             | Content-Type                            | Cache-Control                                        |
| ------------------------------ | -------------------- | --------------------------------------- | ---------------------------------------------------- |
| `/:name/:version/index.js`     | 200 bundle           | `application/javascript; charset=utf-8` | `public, max-age=31536000, immutable`                |
| `/:name/:version/index.js.map` | 200 source map       | `application/json; charset=utf-8`       | `public, max-age=31536000, immutable`                |
| `/:name/latest.js`             | 302 to versioned URL | —                                       | `public, s-maxage=300, stale-while-revalidate=86400` |
| `/manifest.json`               | 200 JSON             | `application/json; charset=utf-8`       | `public, s-maxage=300, stale-while-revalidate=86400` |

`/manifest.json` body lists promoted widgets only:

```json
{
  "sermons": "/sermons/latest.js"
}
```

## Embed Snippet

```html
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
```

## Environment Variables

### Production

| Variable                | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `KV_REST_API_URL`       | Vercel KV / Upstash REST endpoint                                                    |
| `KV_REST_API_TOKEN`     | KV REST token                                                                        |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token                                                         |
| `BLOB_PUBLIC_BASE_URL`  | Blob store public read base (e.g. `https://abcd1234.public.blob.vercel-storage.com`) |

### Local / Dev

Set `RELEASE_STORE_DRIVER=memory` to use the in-memory driver (no KV or Blob required; state is per-process and does not persist across restarts).

## Vercel Provisioning Checklist

1. Create a Blob store; capture `BLOB_READ_WRITE_TOKEN` and the public base URL → `BLOB_PUBLIC_BASE_URL`.
2. Create or link an Upstash Redis store from the Vercel Marketplace; capture `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Add all four env vars to both `apps/cdn` and `apps/studio` in Vercel project settings (Production + Preview).
4. Point `widgets.perimeter.org` at the deployed `apps/cdn` Vercel project.

# apps/studio

Admin UI for the perimeter widgets release workflow. Deployed at `studio.perimeter.org`.

`/admin/releases` shows the full build list with promote and rollback buttons. All `/admin/*` routes are gated by Ministry Platform OAuth via Better Auth stateless cookies.

## Environment Variables

### Auth

| Variable             | Description                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | Random 32+ character secret used for cookie signing                                                            |
| `BETTER_AUTH_URL`    | Studio's public base URL (e.g. `https://studio.perimeter.org`)                                                 |
| `MP_API_BASEURL`     | Ministry Platform API base URL (OAuth discovery at `${MP_API_BASEURL}/oauth/.well-known/openid-configuration`) |
| `MP_API_CLIENT`      | MP OAuth client ID                                                                                             |
| `MP_API_SECRET`      | MP OAuth client secret                                                                                         |

Register this redirect URI with MP:

```
https://studio.perimeter.org/api/auth/callback/ministryplatform
```

### Release Store (same as apps/cdn)

| Variable                | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `KV_REST_API_URL`       | Vercel KV / Upstash REST endpoint                                                    |
| `KV_REST_API_TOKEN`     | KV REST token                                                                        |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token                                                         |
| `BLOB_PUBLIC_BASE_URL`  | Blob store public read base (e.g. `https://abcd1234.public.blob.vercel-storage.com`) |

### Local / Dev

Set `RELEASE_STORE_DRIVER=memory` to use the in-memory driver (no KV or Blob required).

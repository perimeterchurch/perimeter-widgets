# Authentication

> **Scope:** MP OAuth token from WordPress, auth modes, localStorage keys, widget auth patterns
> **Key files:** `packages/auth/src/mp-local-storage-auth.ts`, `packages/widget-runtime/src/hooks/use-auth.ts`

---

## Overview

Widgets read the Ministry Platform OAuth token from `localStorage`, set by WordPress's MP OAuth integration. The widget never handles OAuth flows — it consumes what WordPress has already stored.

---

## localStorage Keys

| Key                        | Value                        | Set by                    |
| -------------------------- | ---------------------------- | ------------------------- |
| `mpp-widgets_AuthToken`    | OAuth access token string    | WordPress MP OAuth plugin |
| `mpp-widgets_ExpiresAfter` | ISO date string (expiration) | WordPress MP OAuth plugin |

These keys are set by the [MP Custom Widgets](https://github.com/MinistryPlatform-Community/MPCustomWidgets) authentication system (`forceLogin.js`).

`MPLocalStorageAuth` (in `@perimeter/auth`) reads these keys, validating that the token exists, is not the literal string `"null"`, and is not past the `mpp-widgets_ExpiresAfter` expiry before treating the user as authenticated.

---

## Auth Flow

```
Widget loads → getMPToken() → token exists & valid?
  ├── Yes → attach to API requests, render authenticated UI
  └── No  → render public fallback or "Sign in" prompt
            (sign-in goes through WordPress's MP OAuth flow,
             populates localStorage, page reload picks it up)
```

---

## Auth modes

`defineWidget({ auth })` takes an `AuthMode`:

| Mode         | Behavior                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| `'none'`     | Auth is skipped entirely. No token is read or attached. (Most widgets, e.g. `sermons`.)   |
| `'optional'` | The token is read if present and attached to API requests, but the widget renders either way. |
| `'required'` | The widget needs a signed-in user; render a sign-in prompt when no valid token is present. |

```tsx
import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
    name: 'my-giving',
    auth: 'required',
    schema: z.object({ campaign: z.string().optional() }),
    App: ({ config, auth }) => <App config={config} auth={auth} />,
});
```

When `auth` is `'optional'` or `'required'`, the active `AuthProvider` reads the token and the API client attaches `Authorization: Bearer <token>` to requests.

### Using auth in components

```tsx
import { useAuth } from '@perimeter/widget-runtime';

function MyComponent() {
    const auth = useAuth();

    if (!auth.isAuthenticated()) {
        return <p>Please sign in to view this content.</p>;
    }

    return <div>Authenticated content here</div>;
}
```

The `App` component also receives the same provider directly via its `auth` prop (`App: ({ config, auth }) => …`).

---

## Token Expiry

If the token expires during an active session:

- API requests will receive 401 responses
- The API client throws `ApiError` with code `TOKEN_EXPIRED`
- React Query's retry (1 attempt) will also fail
- The widget should display a "session expired" message
- A page refresh triggers WordPress's OAuth flow to get a new token

---

## Cross-Tab Sync

`MPLocalStorageAuth` listens for `storage` events and exposes `onChange(cb)`. If the user logs in or out in another tab, subscribers are notified and the auth state updates without a page refresh.

---

## API Request Auth

For an `'optional'`/`'required'` widget, the API client attaches the token to requests:

```
fetch('https://api.perimeter.org/api/endpoint', {
    headers: {
        'Authorization': 'Bearer <mpp-widgets_AuthToken value>',
        'Content-Type': 'application/json'
    }
})
```

The perimeter-api `authenticate()` function accepts this as an OAuth JWT bearer token (via the `Authorization` header) and validates it against MP's JWKS.

---

## Related Docs

- [Architecture Overview](../architecture/overview.md) — the single mount path and auth seam
- [perimeter-api Authentication](../../perimeter-api/docs/guides/authentication.md) — Server-side auth details

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

## Token Expiry and Silent Refresh

MP's widget access token lives 30 minutes (`TM.Widgets` client; `mpp-widgets_ExpiresAfter` is written one minute early). MPWidgets renews it silently — a `credentials: include` GET of the OAuth authorize endpoint with `state=REAUTH`, which the `signin-oidc` callback answers with JSON `{ accessToken, idToken, expiresIn }` while the MP session cookie is valid — but only when one of MP's own widgets is about to call its API. A page with only our widgets used to sign out after 30 minutes while the login widget still showed the member's name (found on the event-registration page, 2026-09-16).

`MPLocalStorageAuth` therefore performs the same renewal itself (2026-09-16): on its 1 s poll, when `ExpiresAfter` is within `refreshLeadSeconds` (default 120) or already past (up to a day), `mpp-widgets_IdToken` is present (the member has not signed out), and an MP app root is known — auto-detected from the `…/widgets/dist/MPWidgets.js` / `UserLogin.js` script tag, or passed as `mpAppRoot` (`false` disables). It fetches `<root>/Api/Auth` for the OAuth configuration, GETs the authorize URL with `state=REAUTH`, and writes the same three localStorage keys MPWidgets writes, sharing `window.mppw_refreshTokenPromise` so the two never race. A refused refresh (MP session gone) leaves the member signed out and backs off for a minute.

If a token still expires during an active session (refresh disabled or MP session ended):

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
- [perimeter-api Authentication](../../../perimeter-api/docs/guides/authentication.md) — Server-side auth details

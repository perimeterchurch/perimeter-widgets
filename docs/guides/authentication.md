# Authentication

> **Scope:** MP OAuth token from WordPress, auth flow, localStorage keys, widget auth patterns
> **Key files:** `packages/shared/src/auth/mp-token.tsx`
> **Last verified:** 2026-03-17

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

---

## Token Validation

`getMPToken()` validates the token before use:

1. Token must exist in localStorage
2. Token must not be the string `"null"`
3. Token must be at least 10 characters
4. If `mpp-widgets_ExpiresAfter` exists, token must not be expired

Returns `{ authenticated: true, token }` or `{ authenticated: false }`.

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

## Public vs Authenticated Widgets

### Public widgets (most widgets)

```tsx
mountWidget({
    elementId: 'perimeter-sermons',
    component: SermonsApp,
    styles,
    requiresAuth: false, // default
});
```

Auth is skipped entirely. No token is read or attached.

### Authenticated widgets

```tsx
mountWidget({
    elementId: 'perimeter-my-giving',
    component: MyGivingApp,
    styles,
    requiresAuth: true,
});
```

The `AuthProvider` reads the token and exposes it via `useAuth()`. The API client attaches `Authorization: Bearer <token>` to requests.

### Using auth in components

```tsx
import { useAuth } from '@perimeter-widgets/shared';

function MyComponent() {
    const { authenticated, token, refresh } = useAuth();

    if (!authenticated) {
        return <p>Please sign in to view this content.</p>;
    }

    return <div>Authenticated content here</div>;
}
```

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

The `AuthProvider` listens for `storage` events. If the user logs in or out in another tab, the auth state updates automatically without a page refresh.

---

## API Request Auth

The API client attaches the token when `requiresAuth: true`:

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

- [Shared Package](../architecture/shared-package.md) — Auth utility implementation
- [perimeter-api Authentication](../../perimeter-api/docs/guides/authentication.md) — Server-side auth details

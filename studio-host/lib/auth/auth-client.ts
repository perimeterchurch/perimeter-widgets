import { createAuthClient } from 'better-auth/react';

// Client for the studio shell. baseURL defaults to the current origin, so it
// talks to this shell's /api/auth/*. Since Better Auth 1.7 the genericOAuth
// provider is a first-class social provider, so no client plugin is needed —
// sign-in goes through `signIn.social({ provider: 'ministryplatform' })`.
export const authClient = createAuthClient({});

export const { signIn, signOut, useSession } = authClient;

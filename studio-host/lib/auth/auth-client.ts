import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient } from 'better-auth/client/plugins';

// Client for the studio shell. Same setup as KB. baseURL defaults to the
// current origin, so it talks to this shell's /api/auth/*.
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;

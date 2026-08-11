import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { authorizeRoles } from './roles';

// Ported from the Knowledge Base (knowledgebase-2.0/src/lib/auth/better-auth.ts):
// Better Auth + generic OAuth → MP OIDC, cookie-backed (no database).
// Differences: cookiePrefix 'studio' (distinct from KB's 'kb'), a `roles`
// additional field, and a ROLE GATE in mapProfileToUser.
const mpBaseURL = process.env.MP_API_BASEURL || '';
const mpOauthURL = `${mpBaseURL}/oauth`;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      // CSV of the allowed MP roles the user holds (for display / audit).
      roles: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Cookie-backed session (no DB), same as KB.
    cookieCache: { enabled: true, maxAge: 60 * 60 }, // 1h — bounds role-revocation lag
  },
  account: {
    storeStateStrategy: 'cookie',
    storeAccountCookie: true,
  },
  advanced: {
    cookiePrefix: 'studio',
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'ministryplatform',
          discoveryUrl: `${mpOauthURL}/.well-known/openid-configuration`,
          clientId: process.env.MP_API_CLIENT || '',
          clientSecret: process.env.MP_API_SECRET || '',
          scopes: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'http://www.thinkministry.com/dataplatform/scopes/all',
          ],
          pkce: false,
          // Not async: the gate is synchronous (the OIDC `roles` claim carries
          // everything). Better Auth accepts a sync mapper and awaits it anyway.
          mapProfileToUser: (profile) => {
            const p = profile as Record<string, unknown>;

            // ── ROLE GATE ──────────────────────────────────────────────
            // MP returns the user's security-role NAMES in the `roles` claim.
            // Allow only Administrators / Website Folder - Edit.
            const { allowed, matched } = authorizeRoles(p.roles);
            if (!allowed) {
              // Throwing aborts the OAuth callback, so NO user/session is
              // created. Task 1.4 passes `errorCallbackURL: '/unauthorized'`
              // at sign-in so this surfaces as the unauthorized page rather
              // than a raw 500.
              throw new Error('ACCESS_DENIED_ROLE');
            }

            const email = typeof p.email === 'string' ? p.email : '';
            const given = typeof p.given_name === 'string' ? p.given_name : '';
            const family = typeof p.family_name === 'string' ? p.family_name : '';
            return {
              email,
              name: `${given} ${family}`.trim() || email,
              firstName: given,
              lastName: family,
              roles: matched.join(','),
            };
          },
        },
      ],
    }),
  ],
});

export type StudioAuthSession = typeof auth.$Infer.Session;

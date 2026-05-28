// apps/studio/tsconfig.json overrides the base config with declaration:false +
// declarationMap:false because Better Auth's inferred types trigger TS2742
// ("inferred type cannot be named without a reference") under d.ts generation
// even though this app has noEmit:true. Removing those overrides will break
// typecheck on the `auth` / `authClient` exports.
import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';

const mpBaseURL = process.env.MP_API_BASEURL || '';
const mpOauthURL = `${mpBaseURL}/oauth`;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24, refreshCache: true },
  },
  account: { storeStateStrategy: 'cookie', storeAccountCookie: true },
  advanced: { cookiePrefix: 'studio' },
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
          mapProfileToUser: (profile) => {
            const firstName = (profile['given_name'] as string | undefined) ?? '';
            const lastName = (profile['family_name'] as string | undefined) ?? '';
            const email = profile['email'] as string;
            return {
              name: `${firstName} ${lastName}`.trim() || email,
              email,
              firstName,
              lastName,
            };
          },
        },
      ],
    }),
  ],
});

export type BetterAuthSession = typeof auth.$Infer.Session;

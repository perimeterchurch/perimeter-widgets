import type { AuthProvider } from '@perimeter/auth';

export interface ApiClientConfig {
  baseUrl: string;
  auth?: AuthProvider | undefined;
}

export interface ApiClient {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
}

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return {
    async fetch(path, init = {}) {
      const headers = new Headers(init.headers);
      const token = config.auth?.getToken() ?? null;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(joinUrl(config.baseUrl, path), { ...init, headers });
    },
  };
}

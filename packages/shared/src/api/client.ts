import {
    createApiClient as createBaseClient,
    type paths,
} from '@perimeterchurch/api';
import type { ApiClientOptions as BaseOptions } from '@perimeterchurch/api';
import type { Client } from 'openapi-fetch';
import { getMPToken } from '../auth/mp-token';

export type { paths, components, operations } from '@perimeterchurch/api';

const PRODUCTION_BASE_URL = 'https://api.perimeter.org';
const DEV_BASE_URL = 'http://localhost:5500';

/**
 * Resolves the API base URL. Priority:
 * 1. Explicit `baseUrl` option (e.g., from data-api-url attribute)
 * 2. VITE_API_URL environment variable
 * 3. localhost:5500 in development, api.perimeter.org in production
 */
function resolveBaseUrl(baseUrl?: string): string {
    if (baseUrl) return baseUrl;

    if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (import.meta.env.DEV) return DEV_BASE_URL;
    }

    return PRODUCTION_BASE_URL;
}

export interface WidgetApiClientOptions {
    baseUrl?: string;
    requiresAuth?: boolean;
    headers?: Record<string, string>;
}

export function createApiClient(
    options: WidgetApiClientOptions = {},
): Client<paths> {
    const { baseUrl, requiresAuth = false, headers } = options;
    const resolvedBaseUrl = resolveBaseUrl(baseUrl);

    const clientOptions: BaseOptions = {
        baseUrl: resolvedBaseUrl,
        headers,
    };

    if (requiresAuth) {
        const auth = getMPToken();
        if (auth.authenticated) {
            clientOptions.token = auth.token;
        }
    }

    return createBaseClient(clientOptions);
}

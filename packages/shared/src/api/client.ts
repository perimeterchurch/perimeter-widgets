import { getMPToken } from '../auth/mp-token';

export interface ApiClientOptions {
    baseUrl?: string;
    requiresAuth?: boolean;
}

export interface ApiClient {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        count?: number;
        cached?: boolean;
    };
}

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

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }
    return headers as Record<string, string>;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
    const { baseUrl, requiresAuth = false } = options;
    const resolvedBaseUrl = resolveBaseUrl(baseUrl);

    async function request<T>(path: string, init?: RequestInit): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...normalizeHeaders(init?.headers),
        };

        // Attach auth token if available and required
        if (requiresAuth) {
            const auth = getMPToken();
            if (auth.authenticated) {
                headers['Authorization'] = `Bearer ${auth.token}`;
            }
        }

        const response = await fetch(`${resolvedBaseUrl}${path}`, {
            ...init,
            headers,
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const message =
                response.status === 401 ?
                    (errorBody?.message ?? 'Session expired')
                :   (errorBody?.message
                    ?? `Request failed: ${response.status}`);
            const code =
                response.status === 401 ?
                    (errorBody?.code ?? 'TOKEN_EXPIRED')
                :   errorBody?.code;
            throw new ApiError(message, response.status, code);
        }

        const json: ApiResponse<T> = await response.json();

        if (!json.success) {
            throw new ApiError(
                'API returned unsuccessful response',
                200,
                'UNSUCCESSFUL',
            );
        }

        return json.data;
    }

    return {
        get<T>(path: string): Promise<T> {
            return request<T>(path);
        },
        post<T>(path: string, body?: unknown): Promise<T> {
            return request<T>(path, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });
        },
    };
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

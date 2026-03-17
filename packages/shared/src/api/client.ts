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

const DEFAULT_BASE_URL = 'https://api.perimeter.org';

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
    const { baseUrl = DEFAULT_BASE_URL, requiresAuth = false } = options;

    async function request<T>(path: string, init?: RequestInit): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(init?.headers as Record<string, string>),
        };

        // Attach auth token if available and required
        if (requiresAuth) {
            const auth = getMPToken();
            if (auth.authenticated) {
                headers['Authorization'] = `Bearer ${auth.token}`;
            }
        }

        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers,
        });

        if (response.status === 401) {
            // Token expired or invalid — surface to caller
            throw new ApiError('Session expired', 401, 'TOKEN_EXPIRED');
        }

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new ApiError(
                errorBody?.message || `Request failed: ${response.status}`,
                response.status,
                errorBody?.code,
            );
        }

        const json: ApiResponse<T> = await response.json();

        if (!json.success) {
            throw new ApiError('API returned unsuccessful response', 500);
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

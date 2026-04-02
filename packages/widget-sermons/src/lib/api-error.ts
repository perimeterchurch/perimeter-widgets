/**
 * Creates a descriptive error from an openapi-fetch error response.
 * Extracts status and message when available for easier debugging.
 */
export function createApiError(label: string, error: unknown): Error {
    if (error && typeof error === 'object') {
        const status =
            'status' in error ?
                (error as { status?: number }).status
            :   undefined;
        const message =
            'message' in error ?
                (error as { message?: string }).message
            :   undefined;
        const detail = [status && `status ${status}`, message]
            .filter(Boolean)
            .join(': ');
        return new Error(detail ? `${label}: ${detail}` : label);
    }
    return new Error(label);
}

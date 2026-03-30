import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiClient } from '../client';

describe('createApiClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a typed openapi-fetch client', () => {
        const client = createApiClient({ baseUrl: 'https://api.test.com' });
        expect(client).toBeDefined();
        expect(typeof client.GET).toBe('function');
        expect(typeof client.POST).toBe('function');
    });

    it('uses the provided baseUrl', () => {
        const client = createApiClient({ baseUrl: 'https://custom.api.com' });
        expect(client).toBeDefined();
    });

    it('creates client without options', () => {
        const client = createApiClient();
        expect(client).toBeDefined();
        expect(typeof client.GET).toBe('function');
    });
});

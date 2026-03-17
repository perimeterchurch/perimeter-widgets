import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiClient, ApiError } from '../client';

describe('createApiClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('unwraps success response envelope', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () =>
                Promise.resolve({
                    success: true,
                    data: [{ id: 1, title: 'Test Sermon' }],
                }),
        });

        const client = createApiClient({ baseUrl: 'https://api.test.com' });
        const result = await client.get('/api/sermons');
        expect(result).toEqual([{ id: 1, title: 'Test Sermon' }]);
    });

    it('throws ApiError on non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: () =>
                Promise.resolve({
                    message: 'Not found',
                    code: 'NOT_FOUND',
                }),
        });

        const client = createApiClient({ baseUrl: 'https://api.test.com' });
        await expect(client.get('/api/sermons/999')).rejects.toThrow(ApiError);
    });

    it('throws ApiError with TOKEN_EXPIRED on 401', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve({}),
        });

        const client = createApiClient({
            baseUrl: 'https://api.test.com',
            requiresAuth: true,
        });

        try {
            await client.get('/api/protected');
            expect.fail('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(ApiError);
            expect((e as ApiError).code).toBe('TOKEN_EXPIRED');
        }
    });
});

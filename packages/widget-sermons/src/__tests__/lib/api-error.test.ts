import { describe, it, expect } from 'vitest';
import { createApiError } from '../../lib/api-error';

describe('createApiError', () => {
    it('returns error with just label when error is null', () => {
        const err = createApiError('Failed to fetch', null);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Failed to fetch');
    });

    it('returns error with just label when error is undefined', () => {
        const err = createApiError('Failed to fetch', undefined);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Failed to fetch');
    });

    it('extracts status from error object', () => {
        const err = createApiError('Request failed', { status: 404 });
        expect(err.message).toBe('Request failed: status 404');
    });

    it('extracts message from error object', () => {
        const err = createApiError('Request failed', {
            message: 'Not Found',
        });
        expect(err.message).toBe('Request failed: Not Found');
    });

    it('combines status and message', () => {
        const err = createApiError('Request failed', {
            status: 500,
            message: 'Internal Server Error',
        });
        expect(err.message).toBe(
            'Request failed: status 500: Internal Server Error',
        );
    });

    it('handles non-object errors gracefully', () => {
        const errStr = createApiError('Request failed', 'some string');
        expect(errStr.message).toBe('Request failed');

        const errNum = createApiError('Request failed', 42);
        expect(errNum.message).toBe('Request failed');

        const errBool = createApiError('Request failed', true);
        expect(errBool.message).toBe('Request failed');
    });

    it('handles object with neither status nor message', () => {
        const err = createApiError('Request failed', { code: 'ERR_NETWORK' });
        expect(err.message).toBe('Request failed');
    });
});

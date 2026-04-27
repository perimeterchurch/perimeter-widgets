import { describe, it, expect } from 'vitest';
import { formatDate } from '../format';

describe('formatDate', () => {
    it('converts an ISO string to a medium-length locale date', () => {
        const result = formatDate('2024-03-15T10:00:00.000Z');
        expect(result).toContain('Mar');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });
});

import { describe, it, expect } from 'vitest';
import { SermonsConfigSchema, resolveCampusId } from '../types';

describe('SermonsConfigSchema', () => {
    it('parses valid config with defaults', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result).toEqual({
            perPage: 12,
            defaultTab: 'sermons',
            defaultView: 'grid',
        });
    });

    it('parses config with campus as number', () => {
        const result = SermonsConfigSchema.parse({ campus: 1 });
        expect(result.campus).toBe(1);
    });

    it('accepts string campus for backwards compatibility', () => {
        const result = SermonsConfigSchema.parse({ campus: 'buckhead' });
        expect(result.campus).toBe('buckhead');
    });
});

describe('resolveCampusId', () => {
    it('returns undefined for undefined input', () => {
        expect(resolveCampusId(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect(resolveCampusId('')).toBeUndefined();
    });

    it('passes through number values', () => {
        expect(resolveCampusId(1)).toBe(1);
    });

    it('maps known slugs to IDs', () => {
        expect(resolveCampusId('buckhead')).toBe(1);
        expect(resolveCampusId('brookhaven')).toBe(2);
        expect(resolveCampusId('peachtree-corners')).toBe(3);
    });

    it('returns undefined for unknown slugs', () => {
        expect(resolveCampusId('unknown')).toBeUndefined();
    });
});

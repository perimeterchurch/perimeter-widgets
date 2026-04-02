import { describe, it, expect } from 'vitest';
import { SermonsConfigSchema } from '../types';

describe('SermonsConfigSchema', () => {
    it('parses valid config with defaults', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result).toEqual({
            perPage: 12,
            defaultTab: 'sermons',
            defaultView: 'grid',
            display: 'full',
        });
    });
});

describe('SermonsConfigSchema — display modes', () => {
    it('accepts tab lock', () => {
        const result = SermonsConfigSchema.parse({ tab: 'sermons' });
        expect(result.tab).toBe('sermons');
    });

    it('accepts display mode', () => {
        const result = SermonsConfigSchema.parse({ display: 'compact' });
        expect(result.display).toBe('compact');
    });

    it('defaults display to full', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result.display).toBe('full');
    });

    it('accepts locked filter params', () => {
        const result = SermonsConfigSchema.parse({
            tab: 'sermons',
            seriesId: 945,
            speakerId: 7,
            bookId: 22,
            serviceTypeId: '1,3',
            from: '2025-01-01',
            to: '2025-12-31',
        });
        expect(result.seriesId).toBe('945');
        expect(result.serviceTypeId).toBe('1,3');
    });

    it('coerces serviceTypeId from number to string', () => {
        const result = SermonsConfigSchema.parse({ serviceTypeId: 42 });
        expect(result.serviceTypeId).toBe('42');
    });

    it('rejects sermon-only filters when tab is series', () => {
        expect(() =>
            SermonsConfigSchema.parse({ tab: 'series', speakerId: 7 }),
        ).toThrow();
    });

    it('allows sermon-only filters when tab is sermons', () => {
        const result = SermonsConfigSchema.parse({
            tab: 'sermons',
            speakerId: 7,
        });
        expect(result.speakerId).toBe('7');
    });

    it('allows sermon-only filters when no tab is set', () => {
        const result = SermonsConfigSchema.parse({ seriesId: 945 });
        expect(result.seriesId).toBe('945');
    });

    it('rejects invalid date format', () => {
        expect(() =>
            SermonsConfigSchema.parse({ from: '01-01-2025' }),
        ).toThrow();
    });
});

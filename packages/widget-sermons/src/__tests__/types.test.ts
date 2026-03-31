import { describe, it, expect } from 'vitest';
import { SermonsConfigSchema, resolveServiceTypeIds } from '../types';
import type { ServiceType } from '../types';

describe('SermonsConfigSchema', () => {
    it('parses valid config with defaults', () => {
        const result = SermonsConfigSchema.parse({});
        expect(result).toEqual({
            perPage: 12,
            defaultTab: 'sermons',
            defaultView: 'grid',
        });
    });

    it('parses config with serviceTypes string', () => {
        const result = SermonsConfigSchema.parse({
            serviceTypes: 'Worship Service,Youth',
        });
        expect(result.serviceTypes).toBe('Worship Service,Youth');
    });
});

describe('resolveServiceTypeIds', () => {
    const serviceTypes: ServiceType[] = [
        { id: 1, name: 'Worship Service' },
        { id: 2, name: 'Youth' },
        { id: 3, name: 'Kids' },
    ];

    it('returns undefined for undefined input', () => {
        expect(resolveServiceTypeIds(undefined, serviceTypes)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect(resolveServiceTypeIds('', serviceTypes)).toBeUndefined();
    });

    it('matches exact names', () => {
        expect(resolveServiceTypeIds('Youth', serviceTypes)).toBe('2');
    });

    it('matches multiple comma-separated names', () => {
        expect(resolveServiceTypeIds('Worship Service,Youth', serviceTypes)).toBe(
            '1,2',
        );
    });

    it('fuzzy matches using substring inclusion', () => {
        expect(resolveServiceTypeIds('worship', serviceTypes)).toBe('1');
    });

    it('returns undefined when no names match', () => {
        expect(
            resolveServiceTypeIds('Unknown Service', serviceTypes),
        ).toBeUndefined();
    });

    it('trims whitespace from config names', () => {
        expect(resolveServiceTypeIds(' Youth , Kids ', serviceTypes)).toBe(
            '2,3',
        );
    });
});

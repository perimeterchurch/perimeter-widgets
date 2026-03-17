import { describe, it, expect } from 'vitest';
import { parseDataAttributes } from '../config';

describe('parseDataAttributes', () => {
    it('converts data attributes to camelCase config', () => {
        const el = document.createElement('div');
        el.dataset.campus = 'buckhead';
        el.dataset.perPage = '12';

        const config = parseDataAttributes(el);
        expect(config).toEqual({
            campus: 'buckhead',
            perPage: 12,
        });
    });

    it('parses boolean values', () => {
        const el = document.createElement('div');
        el.dataset.showFilters = 'true';
        el.dataset.compact = 'false';

        const config = parseDataAttributes(el);
        expect(config).toEqual({
            showFilters: true,
            compact: false,
        });
    });

    it('returns empty object for element with no data attributes', () => {
        const el = document.createElement('div');
        const config = parseDataAttributes(el);
        expect(config).toEqual({});
    });
});

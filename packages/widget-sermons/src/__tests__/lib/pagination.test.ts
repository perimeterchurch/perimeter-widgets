import { describe, it, expect } from 'vitest';
import { getPageRange } from '../../lib/pagination';

describe('getPageRange', () => {
    it('returns [1, 2, 3] for 3 total pages, current page 1', () => {
        expect(getPageRange(1, 3)).toEqual([1, 2, 3]);
    });

    it('returns all pages when totalPages <= 7', () => {
        expect(getPageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(getPageRange(4, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(getPageRange(1, 1)).toEqual([1]);
    });

    it('shows end ellipsis for page 1 of 20 pages', () => {
        expect(getPageRange(1, 20)).toEqual([1, 2, 'ellipsis', 20]);
    });

    it('shows both ellipses for page 10 of 20', () => {
        expect(getPageRange(10, 20)).toEqual([
            1,
            'ellipsis',
            9,
            10,
            11,
            'ellipsis',
            20,
        ]);
    });

    it('shows start ellipsis for last page', () => {
        expect(getPageRange(20, 20)).toEqual([1, 'ellipsis', 19, 20]);
    });

    it('returns empty array for 0 total pages', () => {
        expect(getPageRange(1, 0)).toEqual([]);
    });
});

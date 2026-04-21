import { describe, it, expect } from 'vitest';
import {
    formatDate,
    sermonImageUrl,
    seriesImageUrl,
    formatTime,
    proxyS3Url,
} from '../../lib/format';

describe('formatDate', () => {
    it('converts ISO string to locale date', () => {
        const result = formatDate('2024-03-15T10:00:00.000Z');
        // Luxon DATE_MED produces e.g. "Mar 15, 2024"
        expect(result).toContain('Mar');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });
});

describe('sermonImageUrl', () => {
    it('prepends an explicit base URL when provided', () => {
        expect(sermonImageUrl(42, 'https://api.example.com')).toBe(
            'https://api.example.com/api/sermons/sermon/42/image',
        );
    });

    it('handles different sermon IDs', () => {
        expect(sermonImageUrl(1, 'https://api.example.com')).toBe(
            'https://api.example.com/api/sermons/sermon/1/image',
        );
        expect(sermonImageUrl(9999, 'https://api.example.com')).toBe(
            'https://api.example.com/api/sermons/sermon/9999/image',
        );
    });

    it('falls back to resolveApiBaseUrl when no base URL is passed', () => {
        // Vitest sets import.meta.env.DEV = true and no VITE_API_URL,
        // so resolveApiBaseUrl returns DEV_BASE_URL = '' in dev.
        expect(sermonImageUrl(42)).toBe('/api/sermons/sermon/42/image');
    });
});

describe('seriesImageUrl', () => {
    it('prepends an explicit base URL when provided', () => {
        expect(seriesImageUrl(7, 'https://api.example.com')).toBe(
            'https://api.example.com/api/sermons/series/7/image',
        );
    });

    it('handles different series IDs', () => {
        expect(seriesImageUrl(100, 'https://api.example.com')).toBe(
            'https://api.example.com/api/sermons/series/100/image',
        );
    });

    it('falls back to resolveApiBaseUrl when no base URL is passed', () => {
        expect(seriesImageUrl(7)).toBe('/api/sermons/series/7/image');
    });
});

describe('formatTime', () => {
    it('formats normal seconds', () => {
        expect(formatTime(125)).toBe('2:05');
        expect(formatTime(60)).toBe('1:00');
        expect(formatTime(3661)).toBe('61:01');
    });

    it('returns 0:00 for zero seconds', () => {
        expect(formatTime(0)).toBe('0:00');
    });

    it('returns 0:00 for negative seconds', () => {
        expect(formatTime(-10)).toBe('0:00');
    });

    it('returns 0:00 for Infinity', () => {
        expect(formatTime(Infinity)).toBe('0:00');
    });

    it('returns 0:00 for NaN', () => {
        expect(formatTime(NaN)).toBe('0:00');
    });
});

describe('proxyS3Url', () => {
    it('proxies S3 URL in dev mode (vitest uses DEV=true)', () => {
        const s3Url =
            'https://perimeter-files.s3.amazonaws.com/sermons/image.jpg';
        // Vitest sets import.meta.env.DEV = true, so S3 URLs get proxied
        expect(proxyS3Url(s3Url)).toBe('/s3-proxy/sermons/image.jpg');
    });

    it('returns non-S3 URLs unchanged', () => {
        const url = 'https://example.com/image.jpg';
        expect(proxyS3Url(url)).toBe(url);
    });
});

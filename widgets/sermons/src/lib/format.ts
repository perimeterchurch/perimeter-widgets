import { resolveApiBaseUrl } from '@perimeter-widgets/shared';

const S3_ORIGIN = 'https://perimeter-files.s3.amazonaws.com';

export function proxyS3Url(url: string): string {
    if (import.meta.env.DEV && url.startsWith(S3_ORIGIN)) {
        return url.replace(S3_ORIGIN, '/s3-proxy');
    }
    return url;
}

/**
 * Build a sermon image URL. Pass `apiBaseUrl` (from widget config) so the
 * `<img>` tag resolves against the API origin rather than the host page's
 * origin — otherwise an embed on example.com would request
 * example.com/api/sermons/... and 404. When `apiBaseUrl` is omitted the
 * shared resolver falls back to localhost in dev / api.perimeter.org in
 * production.
 */
export function sermonImageUrl(sermonId: number, apiBaseUrl?: string): string {
    return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/sermon/${sermonId}/image`;
}

export function seriesImageUrl(seriesId: number, apiBaseUrl?: string): string {
    return `${resolveApiBaseUrl(apiBaseUrl)}/api/sermons/series/${seriesId}/image`;
}

export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

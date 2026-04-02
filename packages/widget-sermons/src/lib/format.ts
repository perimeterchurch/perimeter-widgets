import { DateTime } from 'luxon';

export function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

const S3_ORIGIN = 'https://perimeter-files.s3.amazonaws.com';

export function proxyS3Url(url: string): string {
    if (import.meta.env.DEV && url.startsWith(S3_ORIGIN)) {
        return url.replace(S3_ORIGIN, '/s3-proxy');
    }
    return url;
}

export function sermonImageUrl(sermonId: number): string {
    return `/api/sermons/sermon/${sermonId}/image`;
}

export function seriesImageUrl(seriesId: number): string {
    return `/api/sermons/series/${seriesId}/image`;
}

export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

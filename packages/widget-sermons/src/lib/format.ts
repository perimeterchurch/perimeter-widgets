import { DateTime } from 'luxon';

export function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

export function sermonImageUrl(sermonId: number): string {
    return `/api/sermons/${sermonId}/image`;
}

export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

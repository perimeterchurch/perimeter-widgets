import { DateTime } from 'luxon';

export function formatDate(iso: string): string {
    return DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED);
}

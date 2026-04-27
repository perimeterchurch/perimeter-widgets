import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export function useSafeHtml(html: string | null | undefined): {
    __html: string;
} {
    return useMemo(() => ({ __html: DOMPurify.sanitize(html ?? '') }), [html]);
}

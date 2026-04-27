import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSafeHtml } from '../use-safe-html';

describe('useSafeHtml', () => {
    it('returns sanitized HTML wrapped for dangerouslySetInnerHTML', () => {
        const { result } = renderHook(() => useSafeHtml('<p>hi</p>'));
        expect(result.current.__html).toBe('<p>hi</p>');
    });

    it('strips script tags', () => {
        const { result } = renderHook(() =>
            useSafeHtml('<p>safe</p><script>alert(1)</script>'),
        );
        expect(result.current.__html).not.toContain('<script>');
        expect(result.current.__html).toContain('<p>safe</p>');
    });

    it('treats null and undefined as empty strings', () => {
        const { result: nullResult } = renderHook(() => useSafeHtml(null));
        const { result: undefResult } = renderHook(() =>
            useSafeHtml(undefined),
        );
        expect(nullResult.current.__html).toBe('');
        expect(undefResult.current.__html).toBe('');
    });
});

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSafeHtml } from '../src/hooks/use-safe-html';

describe('useSafeHtml', () => {
  it('returns sanitized markup that keeps safe tags', () => {
    const { result } = renderHook(() => useSafeHtml('<p>Hello <strong>world</strong></p>'));
    expect(result.current.__html).toContain('<strong>world</strong>');
  });

  it('strips dangerous markup', () => {
    const { result } = renderHook(() => useSafeHtml('<img src=x onerror=alert(1)>safe'));
    expect(result.current.__html).not.toContain('onerror');
  });

  it('returns empty string for nullish input', () => {
    const { result } = renderHook(() => useSafeHtml(null));
    expect(result.current.__html).toBe('');
  });
});

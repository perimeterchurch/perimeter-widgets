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

  it('drops target by default, and forces every link into a new tab when asked', () => {
    const waiver =
      '<a href="https://cdn.example.org/waiver.pdf" target="_blank" rel="noopener"><b>Waiver</b></a>';
    const plain = '<a href="https://example.org/">site</a>';
    expect(renderHook(() => useSafeHtml(waiver)).result.current.__html).not.toContain('target=');
    const forced = renderHook(() => useSafeHtml(waiver, { linksInNewTab: true })).result.current
      .__html;
    expect(forced).toContain('target="_blank"');
    expect(forced).toContain('rel="noopener noreferrer"');
    expect(forced).toContain('<b>Waiver</b>');
    expect(
      renderHook(() => useSafeHtml(plain, { linksInNewTab: true })).result.current.__html,
    ).toContain('target="_blank"');
    // Still a sanitizer: a javascript: href is removed, target or not.
    const bad = renderHook(() =>
      useSafeHtml('<a href="javascript:alert(1)">x</a>', { linksInNewTab: true }),
    ).result.current.__html;
    expect(bad).not.toContain('javascript:');
    // And the next default call is unaffected by the forced one.
    expect(renderHook(() => useSafeHtml(plain)).result.current.__html).not.toContain('target=');
  });

  it('returns empty string for nullish input', () => {
    const { result } = renderHook(() => useSafeHtml(null));
    expect(result.current.__html).toBe('');
  });
});

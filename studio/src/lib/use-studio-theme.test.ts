// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStudioTheme } from './use-studio-theme';

// The studio CHROME theme — distinct from the widget-preview canvas toggle.
// Defaults to dark, persists to localStorage under "studio-theme", and applies
// data-theme on document.documentElement. typecheck/build can't see the effect,
// so exercise the hook through the DOM.

describe('useStudioTheme', () => {
  // happy-dom in this worker leaves localStorage undefined; mirror the in-memory
  // shim used in theme-toggle.test.tsx so the hook's persistence path runs.
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
          clear: () => store.clear(),
          key: () => null,
          get length() {
            return store.size;
          },
        },
      });
    }
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark when nothing is persisted', () => {
    const { result } = renderHook(() => useStudioTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('applies data-theme="dark" to the document element by default', () => {
    renderHook(() => useStudioTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reads a persisted "light" value on mount', () => {
    localStorage.setItem('studio-theme', 'light');
    const { result } = renderHook(() => useStudioTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setTheme persists and applies the new value', () => {
    const { result } = renderHook(() => useStudioTheme());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('studio-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle flips dark -> light -> dark', () => {
    const { result } = renderHook(() => useStudioTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('studio-theme')).toBe('dark');
  });
});

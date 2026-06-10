import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopiedFlash } from '../src/hooks/use-copied-flash';

describe('useCopiedFlash', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flashes copied and resets after the duration', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopiedFlash(2000));
    expect(result.current.copied).toBe(false);

    act(() => {
      result.current.flash();
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  it('a re-flash restarts the window instead of being truncated by the first timer', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopiedFlash(2000));

    act(() => {
      result.current.flash();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      result.current.flash();
    }); // re-click at t=1.5s

    // The first timer (t=2s) must NOT flip the fresh feedback back early.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1400);
    }); // t=3.5s from the re-flash
    expect(result.current.copied).toBe(false);
  });

  it('clears the pending timer on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useCopiedFlash(2000));
    act(() => {
      result.current.flash();
    });
    unmount();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

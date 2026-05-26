/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilterLabelCache } from '../../src/hooks/use-filter-label-cache';

describe('useFilterLabelCache', () => {
  it('absorb + getLabel round-trips', () => {
    const { result } = renderHook(() => useFilterLabelCache());

    result.current.absorb('speaker', [{ id: 1, label: 'A' }]);

    expect(result.current.getLabel('speaker', 1)).toBe('A');
  });

  it('absorb with a partial list does not remove previously-absorbed entries', () => {
    const { result } = renderHook(() => useFilterLabelCache());

    result.current.absorb('speaker', [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    result.current.absorb('speaker', [{ id: 3, label: 'C' }]);

    expect(result.current.getLabel('speaker', 1)).toBe('A');
    expect(result.current.getLabel('speaker', 2)).toBe('B');
    expect(result.current.getLabel('speaker', 3)).toBe('C');
  });

  it('mergeSelectedIntoOptions appends missing options from the cache in order', () => {
    const { result } = renderHook(() => useFilterLabelCache());

    result.current.absorb('speaker', [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);

    const merged = result.current.mergeSelectedIntoOptions(
      'speaker',
      [{ value: '1', label: 'A' }],
      [1, 2],
    );

    expect(merged).toEqual([
      { value: '1', label: 'A' },
      { value: '2', label: 'B' },
    ]);
  });

  it('falls back to "<Dimension> <id>" when a selected id is unseen', () => {
    const { result } = renderHook(() => useFilterLabelCache());

    const merged = result.current.mergeSelectedIntoOptions('speaker', [], [42]);

    expect(merged).toEqual([{ value: '42', label: 'Speaker 42' }]);
  });

  it('isolates cache entries per dimension', () => {
    const { result } = renderHook(() => useFilterLabelCache());

    result.current.absorb('speaker', [{ id: 1, label: 'John' }]);

    expect(result.current.getLabel('speaker', 1)).toBe('John');
    expect(result.current.getLabel('book', 1)).toBeUndefined();
  });

  it('does not share state between two separate hook instances', () => {
    const hookA = renderHook(() => useFilterLabelCache());
    const hookB = renderHook(() => useFilterLabelCache());

    hookA.result.current.absorb('speaker', [{ id: 1, label: 'A' }]);

    expect(hookA.result.current.getLabel('speaker', 1)).toBe('A');
    expect(hookB.result.current.getLabel('speaker', 1)).toBeUndefined();
  });

  it('returns a referentially stable object across re-renders', () => {
    const { result, rerender } = renderHook(() => useFilterLabelCache());

    const first = result.current;
    rerender();
    const second = result.current;

    expect(second).toBe(first);
  });
});

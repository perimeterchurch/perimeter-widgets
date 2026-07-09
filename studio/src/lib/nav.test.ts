import { describe, it, expect } from 'vitest';
import { buildNav } from './nav';

describe('buildNav', () => {
  it('puts a single static Catalog link first (catalog membership is runtime data)', () => {
    const nav = buildNav([], []);
    expect(nav[0]).toEqual({
      label: 'Catalog',
      items: [{ to: '/catalog', label: 'Widget catalog' }],
    });
  });
});

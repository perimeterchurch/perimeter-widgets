import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import { remToPxPlugin } from '../src/index';

describe('remToPxPlugin export', () => {
  it('rewrites rem lengths to px at 16px/rem', async () => {
    const out = await postcss([remToPxPlugin]).process('.a{margin:1.5rem 0;width:2rem}', {
      from: undefined,
    });
    expect(out.css).toBe('.a{margin:24px 0;width:32px}');
  });
});

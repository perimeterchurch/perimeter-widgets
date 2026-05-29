import { describe, it, expect } from 'vitest';
import { rewriteRootToHost } from '../src/css';

describe('rewriteRootToHost', () => {
  it('rewrites :root selectors to :host so vars resolve inside a shadow root', () => {
    expect(rewriteRootToHost(':root { --x: 1px; }')).toBe(':host { --x: 1px; }');
  });
  it('rewrites :root combined with other selectors', () => {
    expect(rewriteRootToHost(':root, html { color: red; }')).toBe(':host, html { color: red; }');
  });
  it('leaves css without :root untouched', () => {
    expect(rewriteRootToHost('.a { color: red; }')).toBe('.a { color: red; }');
  });
});

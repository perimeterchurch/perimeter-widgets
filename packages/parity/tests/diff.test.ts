import { describe, expect, it } from 'vitest';
import { diffCss } from '../src/diff.ts';

describe('diffCss', () => {
  it('finds selectors present in only one side', () => {
    const d = diffCss('.a{color:red}.b{color:blue}', '.a{color:red}');
    expect(d.onlyInA).toEqual(['.b']);
    expect(d.onlyInB).toEqual([]);
  });

  it('finds value differences and classifies rem→px', () => {
    const d = diffCss('.a{margin:1.5rem}', '.a{margin:24px}');
    expect(d.valueDiffs).toEqual([
      { selector: '.a', prop: 'margin', a: '1.5rem', b: '24px', kind: 'rem-px' },
    ]);
  });

  it('keys media-scoped rules separately', () => {
    const d = diffCss('@media (min-width:768px){.a{color:red}}', '.a{color:red}');
    expect(d.onlyInA).toEqual(['@media (min-width:768px) :: .a']);
    expect(d.onlyInB).toEqual(['.a']);
  });

  it('normalizes whitespace and last-wins duplicate declarations', () => {
    const d = diffCss('.a{color: red;color:blue}', '.a{color:blue}');
    expect(d.valueDiffs).toEqual([]);
    expect(d.onlyInA).toEqual([]);
  });
});

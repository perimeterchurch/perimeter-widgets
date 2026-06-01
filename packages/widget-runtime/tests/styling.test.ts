// packages/widget-runtime/tests/styling.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyStyles, countAppliedSheets, clearStyleCache } from '../src/styling';

beforeEach(() => clearStyleCache());

function shadow(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

describe('applyStyles', () => {
  it('applies a widget layer + a token layer (2 total)', () => {
    const s = shadow();
    applyStyles(s, 'demo', '.x{color:red}', ':host{--color-primary:red}');
    expect(countAppliedSheets(s)).toBe(2);
  });

  it('reuses one shared widget sheet object across instances', () => {
    const a = shadow();
    const b = shadow();
    applyStyles(a, 'demo', '.x{color:red}', ':host{}');
    applyStyles(b, 'demo', '.x{color:red}', ':host{}');
    expect(a.adoptedStyleSheets[0]).toBe(b.adoptedStyleSheets[0]);
  });

  it('update() swaps the token layer and keeps the widget layer', () => {
    const s = shadow();
    const handle = applyStyles(s, 'demo', '.x{}', ':host{--a:1px}');
    const widgetBefore = s.adoptedStyleSheets[0];
    handle.update(':host{--a:2px}');
    expect(s.adoptedStyleSheets[0]).toBe(widgetBefore);
    expect(countAppliedSheets(s)).toBe(2);
  });

  it('dispose() removes all applied styles', () => {
    const s = shadow();
    const handle = applyStyles(s, 'demo', '.x{}', ':host{}');
    handle.dispose();
    expect(countAppliedSheets(s)).toBe(0);
  });
});

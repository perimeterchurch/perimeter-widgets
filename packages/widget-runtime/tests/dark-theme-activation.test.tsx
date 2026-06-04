// packages/widget-runtime/tests/dark-theme-activation.test.tsx
//
// Regression guard for platform dark-mode activation.
//
// Dark mode is a pure CSS-variable swap: `resolveTokens` emits a
// `:host([data-theme="dark"])` block into the per-instance token sheet, and the
// host element's `data-theme="dark"` attribute activates it — with ZERO mount
// parsing. That contract relies on two invariants this test pins down:
//
//   1. A bare `data-theme="dark"` survives `parseDataAttrs` + `schema.parse`
//      without throwing. The attr becomes a `theme` config key that a non-strict
//      zod schema STRIPS (it does not reject). If a widget schema ever used
//      `.strict()`, this mount would throw and white-screen the embed — so this
//      test is the guard that keeps schemas non-strict.
//   2. The `data-theme="dark"` attribute is never removed from the host, so the
//      `:host([data-theme="dark"])` selector can match it.
//   3. The injected token CSS actually contains the dark block.
//
// No runtime code change backs this test — it is a pure regression guard.
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { mount } from '../src/mount';
import { clearStyleCache } from '../src/styling';

beforeEach(() => clearStyleCache());

const widget = defineWidget({
  name: 'm-dark',
  auth: 'none',
  // Non-strict (the default). A bare `data-theme="dark"` lands here as an
  // unknown `theme` key and is stripped, not rejected.
  schema: z.object({ label: z.string().default('hi') }),
  App: ({ config }) => <p data-testid="lbl">{config.label}</p>,
});

const CSS = '.box{color:rgb(1,2,3)}';

/** Read the injected per-instance token CSS regardless of injection mode. */
function tokenCss(shadow: ShadowRoot): string {
  if (shadow.adoptedStyleSheets && shadow.adoptedStyleSheets.length > 0) {
    // [0] is the shared widget sheet; [1] is the per-instance token sheet.
    const tokenSheet = shadow.adoptedStyleSheets[shadow.adoptedStyleSheets.length - 1];
    return Array.from(tokenSheet.cssRules)
      .map((r) => r.cssText)
      .join('\n');
  }
  return shadow.querySelector('style[data-perimeter-tokens]')?.textContent ?? '';
}

describe('dark-theme activation (data-theme="dark" on the host)', () => {
  it('mount does NOT throw when the host carries a bare data-theme="dark" (guards non-strict schema)', () => {
    const host = document.createElement('div');
    host.setAttribute('data-theme', 'dark');
    document.body.appendChild(host);
    let handle: ReturnType<typeof mount> | undefined;
    expect(() => {
      handle = mount(host, widget, CSS);
    }).not.toThrow();
    handle?.unmount();
  });

  it('leaves data-theme="dark" on the host after mount (not stripped) so :host([data-theme]) can match', () => {
    const host = document.createElement('div');
    host.setAttribute('data-theme', 'dark');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    expect(host.getAttribute('data-theme')).toBe('dark');
    handle.unmount();
  });

  it('injects a :host([data-theme="dark"]) token block (dark cascade rides the per-instance sheet)', () => {
    const host = document.createElement('div');
    host.setAttribute('data-theme', 'dark');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    expect(tokenCss(host.shadowRoot!)).toContain(':host([data-theme="dark"])');
    handle.unmount();
  });
});

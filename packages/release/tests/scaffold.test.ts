import { describe, it, expect } from 'vitest';
import { validateWidgetName, renderTemplate } from '../src/scaffold';

describe('validateWidgetName', () => {
  it('accepts kebab-case names', () => {
    expect(validateWidgetName('event-list', [])).toEqual({ ok: true });
  });
  it('rejects non-kebab, uppercase, leading/trailing/double dashes, and empties', () => {
    for (const bad of ['Event', 'event_list', 'event--list', '-x', 'x-', '', 'a b'])
      expect(validateWidgetName(bad, []).ok).toBe(false);
  });
  it('rejects an existing widget name', () => {
    expect(validateWidgetName('example', ['example', 'sermons']).ok).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('substitutes __NAME__ everywhere and yields the widget file set', () => {
    const files = renderTemplate('event-list', {
      'package.json': '{"name":"@perimeter/widget-__NAME__"}',
      'src/widget.tsx': "name: '__NAME__'",
    });
    expect(files['package.json']).toContain('@perimeter/widget-event-list');
    expect(files['src/widget.tsx']).toContain("name: 'event-list'");
    // every placeholder gone
    for (const c of Object.values(files)) expect(c).not.toContain('__NAME__');
  });
});

import { describe, it, expect } from 'vitest';
import { escapeAttribute, serializeWidgetAttrs, buildEmbedSnippet } from './embed-snippet';

describe('escapeAttribute', () => {
  it('escapes &, ", <, >', () => {
    expect(escapeAttribute('a & "b" <c>')).toBe('a &amp; &quot;b&quot; &lt;c&gt;');
  });
});

describe('serializeWidgetAttrs', () => {
  it('emits the widget attr plus sorted kebab-case overrides, escaped', () => {
    expect(serializeWidgetAttrs('sermons', { perPage: 20, title: 'Q&A "live"' }, 'light')).toBe(
      'data-perimeter-widget="sermons" data-per-page="20" data-title="Q&amp;A &quot;live&quot;"',
    );
  });

  it('skips undefined/null/empty values and appends data-theme only when dark', () => {
    expect(serializeWidgetAttrs('sermons', { a: undefined, b: null, c: '' }, 'dark')).toBe(
      'data-perimeter-widget="sermons" data-theme="dark"',
    );
  });
});

describe('buildEmbedSnippet', () => {
  it('is the canonical loader form: script first with data-nowprocket, then the div', () => {
    expect(buildEmbedSnippet('sermons', { perPage: 20 }, 'dark')).toBe(
      '<script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>\n' +
        '<div data-perimeter-widget="sermons" data-per-page="20" data-theme="dark"></div>',
    );
  });
});

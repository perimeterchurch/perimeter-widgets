// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { widgetDescription } from './widget-docs';

// Asserts against the REAL repo docs (globs resolve from repo root in tests,
// same as the dev server) — my-shepherds gains frontmatter in this task.
describe('widget docs frontmatter', () => {
  it('exposes the description frontmatter of a real widget doc', async () => {
    const description = await widgetDescription('my-shepherds');
    expect(description).toBeTruthy();
    expect(typeof description).toBe('string');
  });

  it('returns null for a widget with no doc', async () => {
    expect(await widgetDescription('nope-not-a-widget')).toBeNull();
  });

  // The doc BODY is no longer rendered anywhere, so no loader is exported. The
  // frontmatter above is the only thing these files still feed.
  it('exposes nothing but the description reader', async () => {
    const mod = await import('./widget-docs');
    expect(Object.keys(mod)).toEqual(['widgetDescription']);
  });
});

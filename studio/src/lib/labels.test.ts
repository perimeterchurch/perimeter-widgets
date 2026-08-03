import { describe, it, expect } from 'vitest';
import { titleFromSlug, widgetTitle } from './labels';

describe('titleFromSlug', () => {
  it('prettifies kebab/snake identifiers into Title Case', () => {
    expect(titleFromSlug('spiritual-gifts')).toBe('Spiritual Gifts');
    expect(titleFromSlug('my_shepherds')).toBe('My Shepherds');
    expect(titleFromSlug('sermons')).toBe('Sermons');
  });

  it('is unaffected by the widget display-name overrides', () => {
    // The override lives on `widgetTitle`, not here — components and guides
    // derive their labels from this function and must not inherit widget names.
    expect(titleFromSlug('community-group-finder')).toBe('Community Group Finder');
  });
});

describe('widgetTitle', () => {
  it('falls back to the derived title when a widget has no override', () => {
    expect(widgetTitle('mission-trip-finder')).toBe('Mission Trip Finder');
    expect(widgetTitle('latest-sermon')).toBe('Latest Sermon');
  });

  it('renames community-group-finder to "Group Finder" WITHOUT touching the slug', () => {
    // The slug is the widget's public identity: the `data-perimeter-widget`
    // value on every live host page and the `cdn/<slug>/<version>/` path of
    // every released bundle. Renaming the display label must never become a
    // rename of the slug, or the embeds already on perimeter.org break.
    expect(widgetTitle('community-group-finder')).toBe('Group Finder');
  });
});

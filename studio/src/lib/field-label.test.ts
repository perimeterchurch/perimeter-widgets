import { describe, it, expect } from 'vitest';
import { humanizeKey, fieldLabel } from './field-label';

describe('humanizeKey', () => {
  it('turns a camelCase schema key into a sentence', () => {
    expect(humanizeKey('showDescription')).toBe('Show description');
    expect(humanizeKey('maxTrips')).toBe('Max trips');
    expect(humanizeKey('showTestimonials')).toBe('Show testimonials');
  });

  // "Api url" and "Destination id" read worse than the keys they replace, which
  // would make the fallback a downgrade rather than an improvement.
  it('keeps acronyms upper-case', () => {
    expect(humanizeKey('apiUrl')).toBe('API URL');
    expect(humanizeKey('destinationId')).toBe('Destination ID');
    expect(humanizeKey('galleryUrls')).toBe('Gallery URLs');
    expect(humanizeKey('defaultImageUrl')).toBe('Default image URL');
  });

  it('survives keys that are not camelCase', () => {
    expect(humanizeKey('keyword')).toBe('Keyword');
    expect(humanizeKey('')).toBe('');
    expect(humanizeKey('url')).toBe('URL');
  });
});

describe('fieldLabel', () => {
  it("prefers the widget's own label", () => {
    expect(fieldLabel('detailsMode', { detailsMode: 'What clicking a trip does' })).toBe(
      'What clicking a trip does',
    );
  });

  it('falls back to the humanized key when a field is unlabelled', () => {
    expect(fieldLabel('detailsMode', { showCost: 'Show cost' })).toBe('Details mode');
    expect(fieldLabel('detailsMode')).toBe('Details mode');
  });

  it('ignores an empty label rather than rendering a blank row', () => {
    expect(fieldLabel('showCost', { showCost: '' })).toBe('Show cost');
  });
});

import { describe, it, expect } from 'vitest';
import { camelToKebab, configToDataAttrs } from './data-attr';

describe('camelToKebab', () => {
  it('converts camelCase schema keys to kebab data-attr names', () => {
    expect(camelToKebab('perPage')).toBe('per-page');
    expect(camelToKebab('defaultView')).toBe('default-view');
    expect(camelToKebab('seriesId')).toBe('series-id');
    expect(camelToKebab('display')).toBe('display');
  });
});

describe('configToDataAttrs', () => {
  it('renders set config as space-prefixed data-* attributes, sorted, kebab-cased', () => {
    expect(configToDataAttrs({ perPage: 20, defaultView: 'list' })).toBe(
      ' data-default-view="list" data-per-page="20"',
    );
  });

  it('formats booleans and numbers as strings', () => {
    expect(configToDataAttrs({ showSeriesType: true, perPage: 12 })).toBe(
      ' data-per-page="12" data-show-series-type="true"',
    );
  });

  it('skips undefined / null / empty values', () => {
    expect(configToDataAttrs({ a: undefined, b: null, c: '', perPage: 5 })).toBe(
      ' data-per-page="5"',
    );
  });

  it('returns an empty string when nothing is set', () => {
    expect(configToDataAttrs({})).toBe('');
  });
});

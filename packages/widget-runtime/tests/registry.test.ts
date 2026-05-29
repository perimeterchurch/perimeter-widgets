import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCss,
  getCss,
  registerInstance,
  deregisterInstance,
  getInstances,
  clearAll,
} from '../src/registry';

describe('registry', () => {
  beforeEach(() => clearAll());

  it('stores and retrieves CSS by widget name', () => {
    registerCss('sermons', '.foo { color: red; }');
    expect(getCss('sermons')).toBe('.foo { color: red; }');
  });

  it('returns undefined for unknown CSS name', () => {
    expect(getCss('nope')).toBeUndefined();
  });

  it('tracks live instances per widget name', () => {
    const handle1 = { unmount: () => {}, updateTokens: () => {} };
    const handle2 = { unmount: () => {}, updateTokens: () => {} };
    registerInstance('sermons', handle1);
    registerInstance('sermons', handle2);
    registerInstance('events', handle1);
    expect(getInstances('sermons')).toHaveLength(2);
    expect(getInstances('events')).toHaveLength(1);
  });

  it('deregisters instances cleanly', () => {
    const handle = { unmount: () => {}, updateTokens: () => {} };
    registerInstance('sermons', handle);
    deregisterInstance('sermons', handle);
    expect(getInstances('sermons')).toHaveLength(0);
  });
});

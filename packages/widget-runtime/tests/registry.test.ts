import { describe, it, expect, beforeEach } from 'vitest';
import { registerInstance, deregisterInstance, getInstances, clearAll } from '../src/registry';

const stub = () => ({ unmount() {}, updateTokens() {} });

describe('instance registry', () => {
  beforeEach(() => clearAll());

  it('registers and lists instances by widget name', () => {
    const a = stub();
    registerInstance('demo', a);
    expect(getInstances('demo')).toContain(a);
  });
  it('deregisters an instance', () => {
    const a = stub();
    registerInstance('demo', a);
    deregisterInstance('demo', a);
    expect(getInstances('demo')).not.toContain(a);
  });
  it('clearAll empties the registry', () => {
    registerInstance('demo', stub());
    clearAll();
    expect(getInstances('demo')).toHaveLength(0);
  });
});

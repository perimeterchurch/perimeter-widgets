import { describe, it, expect } from 'vitest';
import { buildVirtualEntry, CSS_PLACEHOLDER } from '../src/virtual-entry';

describe('buildVirtualEntry', () => {
  it('imports the user entry, references the CSS placeholder, and calls runtime hooks', () => {
    const code = buildVirtualEntry({
      entryId: '/abs/widgets/example/src/index.ts',
      version: '1.2.3',
    });
    expect(code).toContain('import definition from');
    expect(code).toContain('/abs/widgets/example/src/index.ts');
    expect(code).toContain('"1.2.3"');
    expect(code).toContain(CSS_PLACEHOLDER);
    expect(code).toContain('registerCss(def.name');
    expect(code).toContain('ensureGlobal(def)');
    expect(code).toContain('autoMount(def)');
  });

  it('escapes backslashes in the entry path (Windows-style)', () => {
    const code = buildVirtualEntry({
      entryId: 'C:\\widgets\\example\\src\\index.ts',
      version: '0.0.0',
    });
    expect(code).toContain('C:\\\\widgets\\\\example\\\\src\\\\index.ts');
  });
});

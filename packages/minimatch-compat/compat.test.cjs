'use strict';
// Plain node:test, so it needs no build and no vitest. Run: node --test
const test = require('node:test');
const assert = require('node:assert');
const minimatch = require('./index.cjs');
const real = require('minimatch');

test('runs on the patched minimatch 11, without changing it', () => {
  assert.strictEqual(require('minimatch/package.json').version.split('.')[0], '11');
  assert.strictEqual(minimatch.Minimatch, real.Minimatch);
  assert.ok(!('makeRe' in real.minimatch) && !('default' in real.minimatch));
});

test('has the 3.x/5.x helper surface hung off the function', () => {
  for (const k of [
    'Minimatch',
    'GLOBSTAR',
    'sep',
    'filter',
    'defaults',
    'braceExpand',
    'makeRe',
    'match',
  ]) {
    assert.ok(k in minimatch, k);
  }
  assert.strictEqual(minimatch.default, minimatch);
});

// Same results as the 3.x/5.x copies it replaces gave for these patterns.
test('matches the way eslint and redocly call it', () => {
  assert.ok(minimatch('src/a/b.ts', '**/*.ts'));
  assert.ok(!minimatch('.hidden/a.ts', '**/*.ts'));
  assert.ok(minimatch('.hidden/a.ts', '**/*.ts', { dot: true }));
  assert.ok(minimatch('a.tsx', '*.{ts,tsx}'));
  assert.throws(() => minimatch.makeRe('*.yaml'), /no makeRe/);
  assert.deepStrictEqual(['a.js', 'b.ts'].filter(minimatch.filter('*.ts')), ['b.ts']);
  assert.ok(new minimatch.Minimatch('**/node_modules/**').match('x/node_modules/y.js'));
});

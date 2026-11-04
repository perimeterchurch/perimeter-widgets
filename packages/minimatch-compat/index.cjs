'use strict';
/**
 * minimatch < 11.0.1 has a glob-pattern DoS advisory (GHSA-g3hv-75wg-m249) and no
 * fixed release in the 3.x or 5.x lines. eslint 9, @eslint/eslintrc,
 * eslint-plugin-react and @redocly/openapi-core 1.x still pin those lines.
 *
 * The root package.json overrides `minimatch@3` and `minimatch@5` to this
 * package. It gives them the export shape they were written against (the
 * module IS the match function, with its helpers hung off it) while every
 * call runs on the patched minimatch 11.
 *
 * Remove it, and the overrides, once those tools move to minimatch >= 11.0.1.
 */
const mm = require('minimatch');

// A wrapper, not mm.minimatch itself: the helpers below are added to this
// function only, so other packages sharing the real minimatch 11 (e.g.
// @typescript-eslint) see it untouched.
function minimatch(path, pattern, options) {
  return mm.minimatch(path, pattern, options);
}
// The 3.x/5.x helpers callers use, as v11 provides them.
for (const key of [
  'sep',
  'GLOBSTAR',
  'filter',
  'defaults',
  'braceExpand',
  'match',
  'Minimatch',
  'escape',
  'unescape',
]) {
  minimatch[key] = mm.minimatch[key];
}
// v11 dropped regex compilation (makeRe) entirely, and none of the tools above
// call it. Fail loudly rather than return a wrong regex if one ever starts to.
minimatch.makeRe = () => {
  throw new Error(
    '@perimeter/minimatch-compat: minimatch 11 has no makeRe. A tool now needs it; see packages/minimatch-compat/index.cjs.',
  );
};
minimatch.minimatch = minimatch;
minimatch.default = minimatch;

module.exports = minimatch;

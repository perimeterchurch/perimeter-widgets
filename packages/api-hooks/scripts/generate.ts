import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and
// path.resolve then reads it as drive-relative, producing "C:\C:\...".
const here = path.dirname(fileURLToPath(import.meta.url));
const spec = path.resolve(here, '../spec/spec.yaml');
const out = path.resolve(here, '../src/generated/operations.ts');

// Run the generator's own entry point under this Node, rather than shelling
// out to `pnpm exec`: `pnpm` is a .cmd shim on Windows that spawnSync cannot
// execute directly, and routing through a shell to reach it would then break
// on any repo path containing a space.
const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve('openapi-typescript/package.json')),
  'bin/cli.js',
);

const result = spawnSync(process.execPath, [cli, spec, '-o', out], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

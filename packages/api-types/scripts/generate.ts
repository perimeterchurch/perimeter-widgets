import { spawnSync } from 'node:child_process';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const spec = path.resolve(here, '../spec/spec.yaml');
const out = path.resolve(here, '../src/operations.ts');

const result = spawnSync('npx', ['openapi-typescript', spec, '-o', out], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toDtcg } from '../src/dtcg';

// Regenerates the committed DTCG interchange file from src/tokens.ts.
// Wired as the root `pnpm tokens:dtcg` script; tests/dtcg.test.ts fails the
// quality gate whenever the committed file drifts from the source tokens.
const out = fileURLToPath(new URL('../tokens.dtcg.json', import.meta.url));
writeFileSync(out, JSON.stringify(toDtcg(), null, 2) + '\n');
console.log(`wrote ${out}`);

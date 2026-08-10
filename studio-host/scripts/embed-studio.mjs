// Copy the Vite-built studio (studio/dist) into studio-host/public so the Next
// shell can serve it as static assets. Run after the studio build.
import { existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const shellRoot = join(here, '..'); // studio-host/
const dist = join(shellRoot, '..', 'studio', 'dist');
const pub = join(shellRoot, 'public');

if (!existsSync(dist)) {
  console.error(
    `[embed] studio build not found at ${dist}\n` +
      `        run:  pnpm --filter @perimeter/studio build` +
      ` (Node <22.18 needs NODE_OPTIONS=--experimental-strip-types)`,
  );
  process.exit(1);
}

// public/ mirrors studio/dist exactly (it is build output, gitignored).
rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
cpSync(dist, pub, { recursive: true });
console.log('[embed] copied studio/dist -> studio-host/public');

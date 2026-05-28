import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore, publishWidget } from '../src/index';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function sh(cmd: string): string {
  return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

async function main(): Promise<void> {
  const name = process.argv[2];
  const force = process.argv.includes('--force');
  if (!name) {
    console.error('usage: pnpm publish-widget <name> [--force]');
    process.exit(1);
  }

  const record = await publishWidget(
    { name, force },
    {
      store: getStore(),
      readPackageVersion: (n) =>
        JSON.parse(readFileSync(path.join(repoRoot, 'widgets', n, 'package.json'), 'utf8')).version,
      gitSha: () => sh('git rev-parse --short HEAD'),
      gitBranch: () => sh('git rev-parse --abbrev-ref HEAD'),
      build: async (n) => {
        execSync(`pnpm --filter @perimeter/widget-${n} build`, { cwd: repoRoot, stdio: 'inherit' });
      },
      readArtifact: (p) => readFileSync(path.join(repoRoot, p)),
    },
  );

  console.log(
    `Published ${name}@${record.version} (${(record.sizeGz / 1024).toFixed(1)} KB gz) — available, not yet live.`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

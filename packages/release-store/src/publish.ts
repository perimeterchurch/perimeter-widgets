import { gzipSync } from 'node:zlib';
import type { BuildRecord, ReleaseStore } from './types';

export function computeVersion(pkgVersion: string, sha: string, branch: string): string {
  return branch === 'main' ? pkgVersion : `${pkgVersion}-${sha}`;
}

export interface PublishHooks {
  store: ReleaseStore;
  readPackageVersion: (name: string) => string;
  gitSha: () => string;
  gitBranch: () => string;
  build: (name: string) => Promise<void>;
  readArtifact: (path: string) => Buffer;
}

export interface PublishOptions {
  name: string;
  force: boolean;
}

export async function publishWidget(opts: PublishOptions, hooks: PublishHooks): Promise<BuildRecord> {
  const { name } = opts;
  const version = computeVersion(hooks.readPackageVersion(name), hooks.gitSha(), hooks.gitBranch());

  const existing = await hooks.store.listBuilds(name);
  if (existing.some((b) => b.version === version) && !opts.force) {
    throw new Error(`Build ${name}@${version} already exists; versions are immutable (use --force on a -sha dev build)`);
  }

  await hooks.build(name);

  const jsPath = `dist/${name}/${name}.iife.js`;
  const mapPath = `${jsPath}.map`;
  const js = hooks.readArtifact(jsPath);
  const map = hooks.readArtifact(mapPath);

  const blobPath = `${name}/${version}/index.js`;
  await hooks.store.uploadBundle(blobPath, js, 'application/javascript');
  await hooks.store.uploadBundle(`${name}/${version}/index.js.map`, map, 'application/json');

  const record: BuildRecord = {
    version,
    sha: hooks.gitSha(),
    sizeGz: gzipSync(js).length,
    builtAt: new Date().toISOString(),
    blobPath,
  };
  await hooks.store.recordBuild(name, record);
  return record;
}

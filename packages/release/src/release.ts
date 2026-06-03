export type Manifest = Record<string, string>;

/** Return a new manifest with `name` pointing at `version` (input unmutated). */
export function setManifestVersion(manifest: Manifest, name: string, version: string): Manifest {
  return { ...manifest, [name]: version };
}

/** Immutable cdn-relative path for a widget bundle. */
export function bundleRelPath(name: string, version: string): string {
  return `${name}/${version}/index.js`;
}

/** Semver-ish compare; a prerelease (1.2.0-x) sorts BELOW its release (1.2.0). */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const dash = v.indexOf('-');
    const core = dash === -1 ? v : v.slice(0, dash); // always a string (no destructuring → no `| undefined`)
    const pre = dash === -1 ? null : v.slice(dash + 1);
    const nums = core.split('.').map((n) => Number.parseInt(n, 10) || 0);
    return { nums, pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1; // release > prerelease
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

/** Given all version strings, return the oldest ones beyond `keep` (newest kept). */
export function versionsToPrune(all: string[], keep: number): string[] {
  const sorted = [...all].sort(compareVersions); // ascending
  return sorted.slice(0, Math.max(0, sorted.length - keep));
}

export interface Rewrite {
  source: string;
  destination: string;
}

/** One `/<name>/latest.js` → current versioned bundle rewrite per manifest entry, name-sorted. */
export function buildRewrites(manifest: Manifest): Rewrite[] {
  return Object.keys(manifest)
    .sort()
    .map((name) => ({
      source: `/${name}/latest.js`,
      destination: `/${name}/${manifest[name]}/index.js`,
    }));
}

export type BumpLevel = 'patch' | 'minor' | 'major';

/** Bump a semver core (drops any prerelease). Throws on a non-numeric version. */
export function nextVersion(current: string, level: BumpLevel): string {
  const core = current.split('-')[0]!;
  const parts = core.split('.').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`cannot bump non-semver version: "${current}"`);
  }
  let [maj, min, pat] = parts as [number, number, number];
  if (level === 'major') {
    maj += 1;
    min = 0;
    pat = 0;
  } else if (level === 'minor') {
    min += 1;
    pat = 0;
  } else {
    pat += 1;
  }
  return `${maj}.${min}.${pat}`;
}

export function releaseBranch(name: string, version: string): string {
  return `release/${name}-${version}`;
}

export interface ReleasePrInput {
  name: string;
  version: string;
  gzBytes?: number | undefined;
}

export function releasePrBody(input: ReleasePrInput): string {
  const size = input.gzBytes != null ? `${(input.gzBytes / 1024).toFixed(1)} KiB gz` : 'n/a';
  return [
    `## Release ${input.name}@${input.version}`,
    '',
    `Built widget bundle published to \`cdn/${input.name}/${input.version}/\`, manifest + \`latest.js\` rewrite updated, pruned to the last 5 versions.`,
    '',
    `- Bundle size: ${size}`,
    '- Promote: merge this PR into `dev`; the batched `dev → main` release deploys it.',
    '- Rollback: revert the release commit or use Vercel Instant Rollback.',
    '',
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  ].join('\n');
}

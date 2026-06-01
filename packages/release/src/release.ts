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

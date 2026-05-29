import { getStore } from '@perimeter/release-store';
import type { ReleaseStore } from '@perimeter/release-store';

let cached: ReleaseStore | undefined;

export function releaseStore(): ReleaseStore {
  return (cached ??= getStore());
}

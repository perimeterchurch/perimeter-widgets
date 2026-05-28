import type { BlobClient, KvClient } from './clients';
import type { ActivityEntry, BuildRecord, ReleaseStore } from './types';
import { ACTIVITY_KEY, buildsKey, latestKey } from './keys';

const ACTIVITY_CAP = 200;

export function createStore(kv: KvClient, blob: BlobClient): ReleaseStore {
  async function pushActivity(entry: ActivityEntry): Promise<void> {
    const log = (await kv.get<ActivityEntry[]>(ACTIVITY_KEY)) ?? [];
    await kv.set(ACTIVITY_KEY, [entry, ...log].slice(0, ACTIVITY_CAP));
  }

  return {
    async listBuilds(name) {
      return (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
    },

    async recordBuild(name, record) {
      const builds = (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
      if (builds.some((b) => b.version === record.version)) {
        throw new Error(`Build ${name}@${record.version} already exists; versions are immutable`);
      }
      await kv.set(buildsKey(name), [record, ...builds]);
      await pushActivity({
        action: 'publish',
        widget: name,
        version: record.version,
        at: record.builtAt,
        by: 'script',
      });
    },

    async getLatest(name) {
      return await kv.get<string>(latestKey(name));
    },

    async setLatest(name, version, action, by) {
      const builds = (await kv.get<BuildRecord[]>(buildsKey(name))) ?? [];
      if (!builds.some((b) => b.version === version)) {
        throw new Error(`Cannot ${action} ${name}@${version}: not a built version`);
      }
      await kv.set(latestKey(name), version);
      await pushActivity({
        action,
        widget: name,
        version,
        at: new Date().toISOString(),
        by,
      });
    },

    async listActivity() {
      return (await kv.get<ActivityEntry[]>(ACTIVITY_KEY)) ?? [];
    },

    uploadBundle(blobPath, body, contentType) {
      return blob.put(blobPath, body, contentType);
    },

    readBundle(blobPath) {
      return blob.get(blobPath);
    },
  };
}

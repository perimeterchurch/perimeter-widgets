import { createStore } from '../store';
import type { ReleaseStore } from '../types';
import { createMemoryKv, createMemoryBlob } from './memory';
import { createVercelKv, createVercelBlob } from './vercel';

export type KvConfig = { kind: 'vercel-kv'; url: string; token: string };

export function resolveKvConfig(env: Record<string, string | undefined>): KvConfig {
  const url = env['KV_REST_API_URL'];
  const token = env['KV_REST_API_TOKEN'];
  if (url && token) return { kind: 'vercel-kv', url, token };

  if (env['REDIS_URL']) {
    throw new Error(
      'release-store: found REDIS_URL but no KV_REST_API_URL/KV_REST_API_TOKEN. ' +
        'The Vercel KV REST credentials are required; if this store only exposes a ' +
        'raw REDIS_URL, add an Upstash adapter (follow-up).',
    );
  }

  throw new Error(
    'release-store: no KV credentials found. Set KV_REST_API_URL + KV_REST_API_TOKEN ' +
      '(or RELEASE_STORE_DRIVER=memory for local/dev).',
  );
}

export function getStore(env: Record<string, string | undefined> = process.env): ReleaseStore {
  if (env['RELEASE_STORE_DRIVER'] === 'memory') {
    return createStore(createMemoryKv(), createMemoryBlob());
  }
  const kvConfig = resolveKvConfig(env);
  const blobToken = env['BLOB_READ_WRITE_TOKEN'];
  if (!blobToken) {
    throw new Error('release-store: BLOB_READ_WRITE_TOKEN is required for the Vercel driver.');
  }
  const blobBaseUrl = env['BLOB_PUBLIC_BASE_URL'];
  if (!blobBaseUrl) {
    throw new Error('release-store: BLOB_PUBLIC_BASE_URL is required for the Vercel driver.');
  }
  return createStore(createVercelKv(kvConfig), createVercelBlob(blobToken, blobBaseUrl));
}

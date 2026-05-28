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

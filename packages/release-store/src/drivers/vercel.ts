import { Redis } from '@upstash/redis';
import { put, head } from '@vercel/blob';
import type { BlobClient, KvClient } from '../clients';
import type { KvConfig } from './env';

export function createVercelKv(config: KvConfig): KvClient {
  const client = new Redis({ url: config.url, token: config.token });
  return {
    async get<T>(key: string): Promise<T | null> {
      return (await client.get<T>(key)) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await client.set(key, value as unknown as string);
    },
  };
}

export function createVercelBlob(token: string): BlobClient {
  const base = process.env['BLOB_PUBLIC_BASE_URL'] ?? '';
  return {
    async put(path, body, contentType) {
      await put(path, body as unknown as Buffer, {
        access: 'public',
        token,
        contentType,
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
      });
    },
    async get(path) {
      const res = await fetch(`${base}/${path}`);
      if (!res.ok || !res.body) return null;
      return res.body;
    },
    async exists(path) {
      try {
        await head(`${base}/${path}`, { token });
        return true;
      } catch {
        return false;
      }
    },
  };
}

import type { BlobClient, KvClient } from '../clients';

export function createMemoryKv(): KvClient {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): Promise<T | null> {
      return Promise.resolve((store.get(key) as T) ?? null);
    },
    set(key: string, value: unknown): Promise<void> {
      store.set(key, value);
      return Promise.resolve();
    },
  };
}

export function createMemoryBlob(): BlobClient {
  const store = new Map<string, Uint8Array>();
  return {
    put(path: string, body: Uint8Array, _contentType: string): Promise<void> {
      store.set(path, body);
      return Promise.resolve();
    },
    get(path: string): Promise<ReadableStream | null> {
      const buf = store.get(path);
      if (!buf) return Promise.resolve(null);
      return Promise.resolve(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(buf);
            controller.close();
          },
        }),
      );
    },
    exists(path: string): Promise<boolean> {
      return Promise.resolve(store.has(path));
    },
  };
}

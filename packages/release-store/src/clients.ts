export interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface BlobClient {
  put(path: string, body: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<ReadableStream | null>;
  exists(path: string): Promise<boolean>;
}

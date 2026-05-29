export interface KvClient {
  // get<T> is a caller-asserted shape; the store knows what it wrote.
  get<T>(key: string): Promise<T | null>;
  // set takes `unknown` honestly — an unconstrained `set<T>(value: T)` would
  // infer T from the argument at every call site, giving the same type-safety
  // as `unknown`. We persist JSON-serializable values; the store handles it.
  set(key: string, value: unknown): Promise<void>;
}

export interface BlobClient {
  // Uint8Array (not Buffer) keeps this interface driver-agnostic: Node Buffer
  // structurally satisfies Uint8Array, so memory + Vercel drivers + the publish
  // script (which reads via fs.readFileSync → Buffer) all fit without casts.
  put(path: string, body: Uint8Array, contentType: string): Promise<void>;
  get(path: string): Promise<ReadableStream | null>;
  exists(path: string): Promise<boolean>;
}

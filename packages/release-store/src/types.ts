export type BuildRecord = {
  version: string; // "1.4.2" or dev "1.4.2-abc1234"
  sha: string; // git short sha
  prUrl?: string; // populated by CI later; omit when absent (exactOptionalPropertyTypes)
  sizeGz: number; // gzipped byte size measured at publish
  builtAt: string; // ISO 8601
  blobPath: string; // "sermons/1.4.2/index.js"
};

export type ActivityAction = 'publish' | 'promote' | 'rollback';

export type ActivityEntry = {
  action: ActivityAction;
  widget: string;
  version: string;
  at: string; // ISO 8601
  by: string; // session email, or "script" for CLI publishes
};

export interface ReleaseStore {
  listBuilds(name: string): Promise<BuildRecord[]>;
  recordBuild(name: string, record: BuildRecord): Promise<void>;
  getLatest(name: string): Promise<string | null>;
  setLatest(
    name: string,
    version: string,
    action: 'promote' | 'rollback',
    by: string,
  ): Promise<void>;
  listActivity(): Promise<ActivityEntry[]>;
  uploadBundle(blobPath: string, body: Buffer, contentType: string): Promise<void>;
  readBundle(blobPath: string): Promise<ReadableStream | null>;
}
